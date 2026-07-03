import os
import time
import json
import httpx
from datetime import datetime
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from mcp.server.fastmcp import FastMCP

# Resolve absolute path to .env file relative to this script
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

mcp = FastMCP("kisan_sahayak_mcp")


def _make_error_envelope(code: str, message: str, retryable: bool = True) -> dict:
    """Constructs a standard error response envelope."""
    return {
        "status": "error",
        "data": None,
        "confidence": None,
        "source": None,
        "error": {
            "code": code,
            "message": message,
            "retryable": retryable
        },
        "clarification": None,
        "meta": {
            "multi_intent": {
                "detected": False,
                "secondary_intent": None
            }
        }
    }


def _make_success_envelope(data_content: dict, confidence: str = "high", source: str = "live") -> dict:
    """Constructs a standard success response envelope."""
    return {
        "status": "success",
        "data": data_content,
        "confidence": confidence,
        "source": source,
        "error": None,
        "clarification": None,
        "meta": {
            "multi_intent": {
                "detected": False,
                "secondary_intent": None
            }
        }
    }


def _error_json(code: str, message: str, retryable: bool = True) -> str:
    """Helper to return JSON-serialized error envelope."""
    return json.dumps(_make_error_envelope(code, message, retryable))


def _success_json(data_content: dict, confidence: str = "high", source: str = "live") -> str:
    """Helper to return JSON-serialized success envelope."""
    return json.dumps(_make_success_envelope(data_content, confidence, source))


def _fetch_data(url: str, params: dict) -> httpx.Response:
    """
    Executes a GET request with a 5.0s timeout and a single retry after a 2.0s delay.
    Returns the httpx.Response object on success or if status is 401/404 (caller handles them).
    Otherwise raises an exception on connection failure, timeout, or other status errors.
    """
    attempts = 2
    for attempt in range(attempts):
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url, params=params)
                # Let caller handle unauthorized or not found specifically
                if response.status_code in (401, 404):
                    return response
                response.raise_for_status()
                return response
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.RequestError) as e:
            if attempt < attempts - 1:
                time.sleep(2.0)
            else:
                raise e


@mcp.tool()
def get_weather_forecast(location: str) -> str:
    """
    Fetches current weather conditions and next 6-hour forecast from OpenWeatherMap.

    Args:
        location: The city/location name to query.

    Returns:
        A JSON string containing the standard response envelope.
    """
    # 1. Validation (Fail Fast)
    if not isinstance(location, str) or not location.strip() or not (2 <= len(location.strip()) <= 100):
        return _error_json("E_INVALID_INPUT", "Location must be a non-empty string between 2 and 100 characters.", retryable=False)

    # 2. Check API Key
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key or "your_" in api_key.lower():
        return _error_json("E_UPSTREAM_UNAVAILABLE", "Weather API key is not configured or is using default placeholder.", retryable=True)

    # 3. Fetch data from OpenWeatherMap API
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "q": location.strip(),
        "appid": api_key.strip(),
        "units": "metric"
    }

    try:
        response = _fetch_data(url, params)
        if response.status_code == 404:
            return _error_json("E_INVALID_INPUT", f"City not found: {location}", retryable=False)
        elif response.status_code == 401:
            return _error_json("E_UPSTREAM_UNAVAILABLE", "Weather service authentication failed (invalid API key).", retryable=True)

        data = response.json()
    except httpx.TimeoutException:
        return _error_json("E_TIMEOUT", "Weather service did not respond within the timeout window.", retryable=True)
    except Exception as e:
        return _error_json("E_UPSTREAM_UNAVAILABLE", f"Weather service error: {str(e)}", retryable=True)

    # 4. Parse response list
    forecast_list = data.get("list", [])
    if not forecast_list:
        return _error_json("E_UPSTREAM_UNAVAILABLE", "No forecast data returned by OpenWeatherMap.", retryable=True)

    current = forecast_list[0]
    
    # Determine condition and temperature
    weather_info = current.get("weather", [{}])[0]
    condition = weather_info.get("main", "clear").lower()
    temp = current.get("main", {}).get("temp", 0.0)
    
    # Determine wind speed (mps to kmh)
    wind_speed_mps = current.get("wind", {}).get("speed", 0.0)
    wind_speed_kmh = round(wind_speed_mps * 3.6, 2)
    
    # Determine rain expected in the next 6 hours (first 2 forecast blocks)
    rain_expected = False
    for item in forecast_list[:2]:
        item_weather = item.get("weather", [{}])[0]
        item_weather_id = item_weather.get("id", 0)
        item_weather_main = item_weather.get("main", "").lower()
        
        if item_weather_main == "rain" or 200 <= item_weather_id < 600:
            rain_expected = True
            break
        
        if "rain" in item:
            rain_volume = item["rain"].get("3h", 0)
            if rain_volume > 0:
                rain_expected = True
                break

    response_data = {
        "condition": condition,
        "temperature_c": temp,
        "rain_expected_next_6h": rain_expected,
        "wind_speed_kmh": wind_speed_kmh
    }
    return _success_json(response_data, confidence="high", source="live")


@mcp.tool()
def get_mandi_price(crop: str, location: str | None = None) -> str:
    """
    Fetches live market price for tomato or wheat from Agmarknet / data.gov.in.

    Args:
        crop: The crop type, must be 'tomato' or 'wheat'.
        location: Optional market/district/state name to filter by.

    Returns:
        A JSON string containing the standard response envelope.
    """
    # 1. Validation (Fail Fast)
    if not isinstance(crop, str) or not crop.strip():
        return _error_json("E_INVALID_INPUT", "Crop must be a non-empty string.", retryable=False)

    norm_crop = crop.strip().lower()
    if norm_crop not in ("tomato", "wheat"):
        return _error_json("E_UNSUPPORTED_CROP", f"Crop '{crop}' is not supported (only tomato/wheat).", retryable=False)

    if location is not None and (not isinstance(location, str) or not location.strip()):
        return _error_json("E_INVALID_INPUT", "Location must be a non-empty string if provided.", retryable=False)

    # 2. Check API Key
    api_key = os.getenv("MANDI_API_KEY")
    if not api_key or "your_" in api_key.lower():
        return _error_json("E_UPSTREAM_UNAVAILABLE", "Mandi Price API key is not configured or is using default placeholder.", retryable=True)

    # 3. Fetch data from Agmarknet API
    url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    params = {
        "api-key": api_key.strip(),
        "format": "json",
        "limit": 100,
        "filters[commodity]": norm_crop.capitalize()
    }

    try:
        response = _fetch_data(url, params)
        if response.status_code == 401:
            return _error_json("E_UPSTREAM_UNAVAILABLE", "Mandi price service authentication failed (invalid API key).", retryable=True)
        elif response.status_code == 404:
            return _error_json("E_UPSTREAM_UNAVAILABLE", "Mandi price service endpoint not found.", retryable=True)

        data = response.json()
    except httpx.TimeoutException:
        return _error_json("E_TIMEOUT", "Mandi price service did not respond within the timeout window.", retryable=True)
    except Exception as e:
        return _error_json("E_UPSTREAM_UNAVAILABLE", f"Mandi price service error: {str(e)}", retryable=True)

    # 4. Process records
    records = data.get("records", [])
    if not records:
        fallback_data = {
            "crop": norm_crop,
            "market": location or "Gandhinagar",
            "price_per_quintal_inr": None,
            "note": "No price records found for this crop."
        }
        return _success_json(fallback_data, confidence="medium", source="fallback")

    matched_record = None
    if location:
        norm_loc = location.strip().lower()
        for r in records:
            market_name = str(r.get("market", "")).lower()
            district_name = str(r.get("district", "")).lower()
            state_name = str(r.get("state", "")).lower()
            if (norm_loc in market_name) or (norm_loc in district_name) or (norm_loc in state_name):
                matched_record = r
                break
    else:
        # Default to Gandhinagar
        for r in records:
            market_name = str(r.get("market", "")).lower()
            if "gandhinagar" in market_name:
                matched_record = r
                break
        if not matched_record:
            matched_record = records[0]

    if not matched_record:
        fallback_data = {
            "crop": norm_crop,
            "market": location,
            "price_per_quintal_inr": None,
            "note": f"No recent price data found for location '{location}'."
        }
        return _success_json(fallback_data, confidence="medium", source="fallback")

    # Match found: extract details
    record_crop = matched_record.get("commodity", norm_crop).lower()
    market = matched_record.get("market", "Unknown")
    
    modal_price_str = matched_record.get("modal_price")
    price_per_quintal = None
    if modal_price_str:
        try:
            price_per_quintal = int(float(modal_price_str))
        except ValueError:
            pass

    # Convert arrival_date using datetime parsing (DD/MM/YYYY -> YYYY-MM-DD)
    arrival_date_str = matched_record.get("arrival_date")
    formatted_date = arrival_date_str
    if arrival_date_str:
        try:
            dt = datetime.strptime(arrival_date_str.strip(), "%d/%m/%Y")
            formatted_date = dt.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            pass

    response_data = {
        "crop": record_crop,
        "market": market,
        "price_per_quintal_inr": price_per_quintal,
        "date": formatted_date
    }

    if price_per_quintal is None:
        response_data["note"] = "No modal price data found in the matched record."
        return _success_json(response_data, confidence="medium", source="fallback")
    else:
        return _success_json(response_data, confidence="high", source="live")


if __name__ == "__main__":
    mcp.run()
