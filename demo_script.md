# Kisan Sahayak — Demo Script

This script outlines a 3-minute sequence of query scenarios to demonstrate Kisan Sahayak's routing, crop disease diagnosis, mandi price reporting, and weather advising capabilities.

---

## Demo Sequence

### Scenario 1: Crop Doctor (Disease Diagnosis)
* **Goal**: Demonstrate visual diagnosis of tomato disease using the local grounded knowledge base.
* **Input**:
  * **Image**: `sample_images/tomato_leaf_curl.png`
  * **Text query**: `"Ye kya rog hai?"`
* **Expected Output**:
  A structured Hindi response:
  ```text
  🌱 Fasal: टमाटर
  🔍 Rog: पर्ण कुंचन रोग / लीफ कर्ल (Leaf Curl Virus)
  ⚠️ Gambhirta: Madhyam
  💊 Ilaaj: (Insecticides like Imidacloprid or Acetamiprid for whiteflies; label-conformance and local KVK advisory)
  🛡️ Bachaav: (Nursery netting, yellow sticky traps, weed cleanup)
  ```

### Scenario 2: Mandi Price (Market Prices)
* **Goal**: Demonstrate market price queries and graceful API fallback behavior.
* **Input**:
  * **Text query**: `"Gandhinagar me tamatar ka bhaav batao"`
* **Expected Output**:
  If live keys are configured, prints live prices. If keys are missing (default fallback path), prints:
  ```text
  टमाटर का लाइव भाव अभी उपलब्ध नहीं है।
  आम तौर पर टमाटर का भाव इस मौसम में ₹15 से ₹30 प्रति किलोग्राम के आस-पास रहता है — कृपया स्थानीय मंडी से पुष्टि करें।
  ```

### Scenario 3: Weather Advisor (Spray/Irrigation Advice)
* **Goal**: Demonstrate spray/irrigation timing recommendations based on weather parameters.
* **Input**:
  * **Text query**: `"Delhi me weather kaisa hai, kya spray karu?"`
* **Expected Output**:
  If live keys are configured, interprets forecast parameters (rain, wind, temperature) to give a recommendation. If keys are missing (default fallback path), prints:
  ```text
  फिलहाल लाइव मौसम की जानकारी उपलब्ध नहीं है।
  सामान्य नियम के तौर पर: आम तौर पर सुबह जल्दी या शाम को स्प्रे/सिंचाई करना सबसे सुरक्षित रहता है — इस मौसम के हिसाब से स्थानीय सलाह भी लें।
  ```
