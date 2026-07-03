import unittest
import json
import sys
import os
from unittest.mock import patch, MagicMock

# Ensure project root is in the path
sys.path.insert(0, r"c:\Users\Kirta\OneDrive\Desktop\Kisan Sahayak")

import httpx
from mcp_server.server import get_weather_forecast, get_mandi_price

class TestMCPServer(unittest.TestCase):
    
    def setUp(self):
        # Set dummy keys so API checks pass
        os.environ["OPENWEATHER_API_KEY"] = "dummy_weather_key"
        os.environ["MANDI_API_KEY"] = "dummy_mandi_key"

    @patch("mcp_server.server.httpx.Client")
    def test_weather_success(self, mock_client_class):
        # Mock weather response data
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "list": [
                {
                    "weather": [{"id": 800, "main": "Clear"}],
                    "main": {"temp": 32.5},
                    "wind": {"speed": 2.22}
                },
                {
                    "weather": [{"id": 801, "main": "Clouds"}],
                    "main": {"temp": 31.0},
                    "wind": {"speed": 2.5}
                }
            ]
        }
        
        # Setup client mock
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        result_str = get_weather_forecast("Bhopal")
        result = json.loads(result_str)
        
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["confidence"], "high")
        self.assertEqual(result["source"], "live")
        self.assertIsNone(result["error"])
        
        data = result["data"]
        self.assertEqual(data["condition"], "clear")
        self.assertEqual(data["temperature_c"], 32.5)
        self.assertEqual(data["rain_expected_next_6h"], False)
        # 2.22 m/s * 3.6 = 7.992 -> round(7.992, 2) = 7.99
        self.assertEqual(data["wind_speed_kmh"], 7.99)

    @patch("mcp_server.server.httpx.Client")
    def test_weather_rain_expected(self, mock_client_class):
        # Mock weather response data indicating rain in next block (3-6h)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "list": [
                {
                    "weather": [{"id": 800, "main": "Clear"}],
                    "main": {"temp": 30.0},
                    "wind": {"speed": 1.0}
                },
                {
                    "weather": [{"id": 500, "main": "Rain"}],
                    "main": {"temp": 28.0},
                    "wind": {"speed": 1.5}
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        result_str = get_weather_forecast("Bhopal")
        result = json.loads(result_str)
        self.assertEqual(result["data"]["rain_expected_next_6h"], True)

    def test_weather_validation_fail(self):
        # Test invalid inputs trigger E_INVALID_INPUT immediately
        for bad_input in ["", "a", "x" * 101, None, 123]:
            result_str = get_weather_forecast(bad_input)
            result = json.loads(result_str)
            self.assertEqual(result["status"], "error")
            self.assertEqual(result["error"]["code"], "E_INVALID_INPUT")
            self.assertEqual(result["error"]["retryable"], False)

    @patch("mcp_server.server.httpx.Client")
    def test_weather_city_not_found(self, mock_client_class):
        # Mock OWM 404 response
        mock_response = MagicMock()
        mock_response.status_code = 404
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        result_str = get_weather_forecast("invalid_city")
        result = json.loads(result_str)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "E_INVALID_INPUT")
        self.assertEqual(result["error"]["retryable"], False)

    @patch("mcp_server.server.httpx.Client")
    def test_weather_timeout_and_retry_success(self, mock_client_class):
        # Mock first call raises timeout, second call succeeds
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "list": [
                {
                    "weather": [{"id": 800, "main": "Clear"}],
                    "main": {"temp": 32.5},
                    "wind": {"speed": 2.22}
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        
        mock_client.get.side_effect = [httpx.TimeoutException("Timeout"), mock_response]
        mock_client_class.return_value = mock_client
        
        # Mock time.sleep to avoid waiting 2 seconds in test
        with patch("mcp_server.server.time.sleep") as mock_sleep:
            result_str = get_weather_forecast("Bhopal")
            result = json.loads(result_str)
            self.assertEqual(result["status"], "success")
            self.assertEqual(result["data"]["temperature_c"], 32.5)
            mock_sleep.assert_called_once_with(2.0)

    @patch("mcp_server.server.httpx.Client")
    def test_weather_unauthorized(self, mock_client_class):
        # Mock 401 response
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        result_str = get_weather_forecast("Bhopal")
        result = json.loads(result_str)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error"]["code"], "E_UPSTREAM_UNAVAILABLE")
        self.assertEqual(result["error"]["retryable"], True)

    @patch("mcp_server.server.httpx.Client")
    def test_mandi_price_success(self, mock_client_class):
        # Mock mandi response with multiple markets
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "records": [
                {
                    "state": "Gujarat",
                    "district": "Gandhinagar",
                    "market": "Gandhinagar",
                    "commodity": "Tomato",
                    "modal_price": "1800",
                    "arrival_date": "02/07/2026"
                },
                {
                    "state": "Gujarat",
                    "district": "Ahmedabad",
                    "market": "Ahmedabad",
                    "commodity": "Tomato",
                    "modal_price": "2200",
                    "arrival_date": "01/07/2026"
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        # Test default location Gandhinagar
        result_str = get_mandi_price("tomato")
        result = json.loads(result_str)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["confidence"], "high")
        self.assertEqual(result["source"], "live")
        data = result["data"]
        self.assertEqual(data["crop"], "tomato")
        self.assertEqual(data["market"], "Gandhinagar")
        self.assertEqual(data["price_per_quintal_inr"], 1800)
        self.assertEqual(data["date"], "2026-07-02")
        
        # Test specific location Ahmedabad
        result_str = get_mandi_price("tomato", "Ahmedabad")
        result = json.loads(result_str)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["data"]["market"], "Ahmedabad")
        self.assertEqual(result["data"]["price_per_quintal_inr"], 2200)
        self.assertEqual(result["data"]["date"], "2026-07-01")

    @patch("mcp_server.server.httpx.Client")
    def test_mandi_price_not_found_location(self, mock_client_class):
        # Mock mandi response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "records": [
                {
                    "state": "Gujarat",
                    "district": "Gandhinagar",
                    "market": "Gandhinagar",
                    "commodity": "Tomato",
                    "modal_price": "1800",
                    "arrival_date": "02/07/2026"
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        # Test location not in list -> fallback output
        result_str = get_mandi_price("tomato", "NonExistentMarket")
        result = json.loads(result_str)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["confidence"], "medium")
        self.assertEqual(result["source"], "fallback")
        self.assertIsNone(result["data"]["price_per_quintal_inr"])
        self.assertEqual(result["data"]["market"], "NonExistentMarket")

    def test_mandi_validation_fail(self):
        # Test invalid crops
        for bad_crop in ["mango", "", None, 123]:
            result_str = get_mandi_price(bad_crop)
            result = json.loads(result_str)
            self.assertEqual(result["status"], "error")
            if bad_crop == "mango":
                self.assertEqual(result["error"]["code"], "E_UNSUPPORTED_CROP")
            else:
                self.assertEqual(result["error"]["code"], "E_INVALID_INPUT")
            self.assertEqual(result["error"]["retryable"], False)

if __name__ == "__main__":
    unittest.main()
