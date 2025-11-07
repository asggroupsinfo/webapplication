### **Forex Master Pro: Backend Architecture Document**

यह दस्तावेज़ 'Forex Master Pro' प्लेटफॉर्म के लिए एक विस्तृत तकनीकी आर्किटेक्चर को परिभाषित करता है। यह पिछली विश्लेषण रिपोर्ट और हाल के UI मॉकअप से मिले इनपुट्स को ध्यान में रखकर बनाया गया है, जिसमें विशेष रूप से बैकटेस्टिंग और सोशल ट्रेडिंग पर ध्यान केंद्रित किया गया है।

***

### **1. Sudhari Hui Architecture Overview (Revised Architecture)**

हमारा आर्किटेक्चर प्रदर्शन, मापनीयता (scalability), और मजबूती (robustness) के लिए डिज़ाइन किया गया है। यह एक आधुनिक स्टैक का उपयोग करता है जो रियल-टाइम डेटा प्रोसेसिंग और उच्च उपयोगकर्ता भार को संभालने में सक्षम है।

#### **High-Level Diagram**

#### **Component Breakdown**

| Component                    | Technology                          | Purpose (उद्देश्य)                                                                                                                                                                              |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reverse Proxy / WAF**      | Nginx / Cloudflare                  | SSL/TLS टर्मिनेशन, लोड बैलेंसिंग, DDoS सुरक्षा, और इनकमिंग रिक्वेस्ट को Gunicorn पर रूट करना।                                                                                                   |
| **Web Server Gateway**       | Gunicorn                            | एक प्रोडक्शन-ग्रेड WSGI सर्वर जो FastAPI के Uvicorn वर्कर्स को मैनेज करता है, जिससे हम सभी CPU कोर का लाभ उठा सकते हैं।                                                                         |
| **Application Backend**      | FastAPI (Python)                    | मुख्य एप्लिकेशन लॉजिक, API एंडपॉइंट्स, और व्यावसायिक तर्क (business logic) को संभालता है। इसका एसिंक्रोनस नेचर I/O-बाउंड कार्यों के लिए बेहतरीन है।                                             |
| **Real-time Communication**  | WebSockets                          | क्लाइंट (फ्रंटएंड) और सर्वर के बीच द्विदिश (bi-directional), रियल-टाइम डेटा (जैसे मार्केट टिक) के लिए।                                                                                          |
| **In-Memory Cache & Broker** | Redis                               | 1. **कैशिंग:** बार-बार एक्सेस होने वाले डेटा (जैसे ऐतिहासिक कैंडल डेटा, यूजर प्रोफाइल) को स्टोर करना। 2. **मैसेज ब्रोकर:** Celery के लिए टास्क क्यू और WebSocket स्केलिंग के लिए Pub/Sub चैनल।  |
| **Database**                 | PostgreSQL                          | सभी स्थायी डेटा (users, trades, strategies, etc.) के लिए हमारा प्राथमिक रिलेशनल डेटाबेस।                                                                                                        |
| **Async Task Queue**         | Celery                              | लंबे समय तक चलने वाले कार्यों (जैसे बैकटेस्टिंग, ईमेल भेजना, वेबहुक अलर्ट) को बैकग्राउंड में चलाना ताकि API रिस्पांस ब्लॉक न हो।                                                                |
| **Forex Data Bridge**        | MT5 Python Bridge                   | एक अलग, स्थायी (persistent) Python स्क्रिप्ट जो MetaTrader 5 टर्मिनल से कनेक्ट होती है, रियल-टाइम टिक डेटा प्राप्त करती है, और इसे WebSocket के माध्यम से या Redis Pub/Sub पर प्रकाशित करती है। |
| **Scripting Engine**         | Pine-Script-Engine (Python Library) | उपयोगकर्ताओं द्वारा प्रदान की गई पाइन स्क्रिप्ट को सर्वर-साइड पर चलाना ताकि बैकटेस्टिंग और कस्टम इंडिकेटर गणना की जा सके।                                                                       |

***

### **2. Vistrit Database Schema (PostgreSQL)**

यह स्कीमा प्लेटफॉर्म की सभी कार्यात्मकताओं, जिसमें बैकटेस्टिंग और सोशल ट्रेडिंग शामिल हैं, का समर्थन करने के लिए डिज़ाइन किया गया है।

```sql
-- For UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Table: `users`**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `accounts` (Trading Accounts)**

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt5_login BIGINT NOT NULL,
    encrypted_mt5_password TEXT NOT NULL, -- Encrypted password
    mt5_server VARCHAR(255) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    equity NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mt5_login)
);
```

**Table: `trades`**

```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    ticket BIGINT UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL, -- e.g., 'BUY', 'SELL'
    volume NUMERIC(10, 2) NOT NULL,
    open_price NUMERIC(10, 5) NOT NULL,
    close_price NUMERIC(10, 5),
    stop_loss NUMERIC(10, 5),
    take_profit NUMERIC(10, 5),
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ,
    profit NUMERIC(15, 2),
    status VARCHAR(20) DEFAULT 'OPEN' -- 'OPEN', 'CLOSED'
);
```

**Table: `strategies` (Pine Scripts)**

```sql
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    script_code TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `backtesting_results`**

```sql
CREATE TABLE backtesting_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    strategy_id UUID NOT NULL REFERENCES strategies(id),
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    net_profit NUMERIC(15, 2),
    max_drawdown NUMERIC(15, 2),
    win_rate NUMERIC(5, 2),
    profit_factor NUMERIC(10, 2),
    total_trades INT,
    results_data JSONB, -- Stores equity curve and trade list
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: `social_profiles`**

```sql
CREATE TABLE social_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    bio TEXT,
    roi_monthly NUMERIC(8, 2) DEFAULT 0.00, -- Return on Investment
    risk_score INT, -- Calculated metric (e.g., 1-10)
    followers_count INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE
);
```

**Table: `copy_trades`**

```sql
CREATE TABLE copy_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_account_id UUID NOT NULL REFERENCES accounts(id),
    leader_user_id UUID NOT NULL REFERENCES users(id),
    risk_type VARCHAR(20) DEFAULT 'FIXED_LOT', -- e.g., 'FIXED_LOT', 'PROPORTIONAL'
    risk_value NUMERIC(10, 2) NOT NULL, -- e.g., 0.01 for fixed lot, or 1.0 for 100% proportion
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    stopped_at TIMESTAMPTZ,
    UNIQUE(follower_account_id, leader_user_id)
);
```

**Table: `alerts`**

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    symbol VARCHAR(20) NOT NULL,
    condition_type VARCHAR(20) NOT NULL, -- 'PRICE_ABOVE', 'PRICE_BELOW', etc.
    value NUMERIC(10, 5) NOT NULL,
    trigger_type VARCHAR(20) DEFAULT 'ONCE', -- 'ONCE', 'RECURRING'
    notification_method VARCHAR(20) DEFAULT 'WEBHOOK', -- 'WEBHOOK', 'EMAIL'
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

***

### **3. API Endpoint Sanrachna (API Endpoint Structure)**

#### **RESTful API Endpoints (v1)**

* **User Authentication** (JWT-based)

  * `POST /api/v1/auth/register`: नया यूजर रजिस्टर करें।
  * `POST /api/v1/auth/token`: लॉगिन करें और JWT टोकन प्राप्त करें।
  * `POST /api/v1/auth/refresh`: रिफ्रेश टोकन का उपयोग करके नया एक्सेस टोकन प्राप्त करें।
  * `GET /api/v1/users/me`: प्रमाणित यूजर की प्रोफाइल प्राप्त करें।
* **Trading Operations**

  * `POST /api/v1/trades`: नया ट्रेड खोलें (MT5 पर निष्पादित होगा)।
  * `PUT /api/v1/trades/{trade_id}`: मौजूदा ट्रेड (SL/TP) को संशोधित करें।
  * `POST /api/v1/trades/{trade_id}/close`: ट्रेड को बंद करें।
  * `GET /api/v1/accounts/{account_id}/trades`: एक खाते के सभी खुले और बंद ट्रेड प्राप्त करें।
* **Custom Alerts**

  * `POST /api/v1/alerts`: नया अलर्ट बनाएं।
  * `GET /api/v1/users/me/alerts`: उपयोगकर्ता के सभी अलर्ट सूचीबद्ध करें।
  * `DELETE /api/v1/alerts/{alert_id}`: एक अलर्ट हटाएं।
* **Pine Script Editor**

  * `POST /api/v1/strategies`: एक नई रणनीति सहेजें।
  * `GET /api/v1/strategies/{strategy_id}`: एक विशिष्ट रणनीति लोड करें।
  * `GET /api/v1/users/me/strategies`: उपयोगकर्ता की सभी रणनीतियों को सूचीबद्ध करें।
  * `PUT /api/v1/strategies/{strategy_id}`: एक मौजूदा रणनीति को अपडेट करें।
* **Strategy Backtesting (Naya)**

  * `POST /api/v1/backtest/start`: एक नया बैकटेस्ट शुरू करें। बॉडी में `strategy_id`, `symbol`, `timeframe`, `start_date`, `end_date` शामिल होंगे। यह एक `task_id` लौटाएगा।
  * `GET /api/v1/backtest/status/{task_id}`: बैकटेस्ट कार्य की स्थिति (पेंडिंग, प्रगति पर, सफल) की जांच करें।
  * `GET /api/v1/backtest/results/{result_id}`: एक पूर्ण बैकटेस्ट के विस्तृत परिणाम प्राप्त करें।
  * `GET /api/v1/users/me/backtests`: उपयोगकर्ता के पिछले सभी बैकटेस्ट की सूची प्राप्त करें।
* **Social/Copy Trading (Naya)**

  * `GET /api/v1/social/leaderboard`: प्रदर्शन के आधार पर शीर्ष व्यापारियों की सूची प्राप्त करें।
  * `GET /api/v1/social/profile/{user_id}`: एक व्यापारी का सार्वजनिक प्रोफ़ाइल और प्रदर्शन आँकड़े देखें।
  * `PUT /api/v1/social/profile/me`: उपयोगकर्ता को अपना सार्वजनिक प्रोफ़ाइल अपडेट करने की अनुमति दें।
  * `POST /api/v1/copy-trading/copy`: एक व्यापारी को कॉपी करना शुरू करें। बॉडी में `leader_user_id` और `risk_value` शामिल होंगे।
  * `POST /api/v1/copy-trading/uncopy`: एक व्यापारी को कॉपी करना बंद करें।
  * `GET /api/v1/users/me/copying`: उन व्यापारियों की सूची प्राप्त करें जिन्हें वर्तमान उपयोगकर्ता कॉपी कर रहा है।

#### **WebSocket Events**

* **Endpoint:** `wss://yourdomain.com/ws/v1/{user_id}`
* **Connection:** क्लाइंट JWT टोकन के साथ प्रमाणित करता है।
* **Server-to-Client Events:**

  * `market_data`: सब्सक्राइब किए गए सिंबल के लिए रियल-टाइम टिक डेटा भेजता है। `{"event": "market_data", "symbol": "EURUSD", "bid": 1.0850, "ask": 1.0852}`
  * `trade_update`: जब कोई ट्रेड खुलता, बंद होता या संशोधित होता है तो अपडेट भेजता है।
  * `alert_triggered`: जब कोई अलर्ट शर्त पूरी होती है तो एक अधिसूचना भेजता है।
  * `connection_status`: MT5 ब्रिज कनेक्शन की स्थिति (`CONNECTED`, `DISCONNECTED`) के बारे में सूचित करता है।
* **Client-to-Server Events:**

  * `subscribe_symbols`: क्लाइंट उन सिंबल की सूची भेजता है जिनके लिए वह मार्केट डेटा प्राप्त करना चाहता है।
  * `unsubscribe_symbols`: सदस्यता समाप्त करने के लिए।

***

### **4. Scalability aur Performance**

उच्च-आवृत्ति डेटा और हजारों समवर्ती उपयोगकर्ताओं को संभालने के लिए, निम्नलिखित रणनीतियाँ महत्वपूर्ण हैं:

1. **Asynchronous Task Processing (Celery + Redis):**

> **समस्या:** बैकटेस्टिंग या बाहरी वेबहुक को कॉल करने जैसे कार्यों में सेकंड या मिनट लग सकते हैं, जिससे API अनुरोधों का समय समाप्त हो जाएगा।
> **समाधान:** इन लंबे समय तक चलने वाले कार्यों को Celery को सौंपा जाता है। FastAPI तुरंत एक `task_id` के साथ प्रतिक्रिया देता है, और उपयोगकर्ता बाद में परिणाम के लिए स्थिति की जांच कर सकता है। यह हमारे API को उत्तरदायी (responsive) बनाए रखता है।

```bash
# Example command to run Celery worker
celery -A app.tasks worker --loglevel=info
```

2. **Redis Caching:**

> **उपयोग:** हम ऐतिहासिक कैंडल डेटा, उपयोगकर्ता प्रोफाइल और लीडरबोर्ड जैसी बार-बार एक्सेस की जाने वाली जानकारी को कैश करने के लिए Redis का उपयोग करेंगे।
> **लाभ:** यह सीधे डेटाबेस पर हिट की संख्या को काफी कम कर देता है, जिससे प्रतिक्रिया समय तेज होता है और डेटाबेस पर भार कम होता है।

3. **Database Connection Pooling:**

> **समस्या:** हर अनुरोध के लिए एक नया डेटाबेस कनेक्शन बनाना अक्षम है।
> **समाधान:** আমরা `pgBouncer` જેવા બાહ્ય પૂલરનો ઉપયોગ કરીશું અથવા SQLAlchemy માં બિલ્ટ-ઇન કનેક્શન પૂલિંગનો લાભ લઈશું। यह उपलब्ध कनेक्शनों का एक पूल बनाए रखता है जिन्हें अनुरोधों के बीच पुन: उपयोग किया जा सकता है, जिससे विलंबता (latency) कम होती है।

4. **Horizontal Scaling of WebSockets (Redis Pub/Sub):**

> **समस्या:** एक एकल FastAPI इंस्टेंस केवल सीमित संख्या में स्थायी WebSocket कनेक्शन को संभाल सकता है।
> **समाधान:** हम कई FastAPI इंस्टेंस चलाएंगे। जब MT5 ब्रिज से कोई नया टिक आता है, तो वह उसे सीधे किसी विशिष्ट क्लाइंट को नहीं भेजता है। इसके बजाय, वह डेटा को एक Redis "चैनल" (जैसे, `ticks:EURUSD`) पर प्रकाशित करता है। सभी FastAPI इंस्टेंस इन चैनलों को सब्सक्राइब करते हैं और डेटा को अपने संबंधित कनेक्टेड क्लाइंट्स को रिले करते हैं। यह हमें WebSocket कनेक्शन को कई सर्वरों में स्केल करने की अनुमति देता है।

***

### **5. Security Anushansayein (Security Recommendations)**

वित्तीय डेटा को संभालने वाले एक एप्लिकेशन के लिए सुरक्षा सर्वोपरि है।

| खतरा (Threat)                  | सुरक्षा उपाय (Security Measure)            | कार्यान्वयन (Implementation)                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **अनधिकृत API एक्सेस**         | **JWT Authentication & Rate Limiting**     | सभी संवेदनशील एंडपॉइंट्स को JWT टोकन से सुरक्षित करें। ब्रूट-फोर्स हमलों को रोकने के लिए `slowapi` जैसी लाइब्रेरी का उपयोग करके लॉगिन और अन्य महत्वपूर्ण एंडपॉइंट्स पर रेट लिमिटिंग लागू करें।                                                                                        |
| **डेटा इंटरसेप्शन**            | **Encryption in Transit (SSL/TLS)**        | उत्पादन में केवल HTTPS और सुरक्षित WebSocket (`wss://`) कनेक्शन की अनुमति दें। Cloudflare या Nginx के माध्यम से इसे लागू करें।                                                                                                                                                        |
| **SQL इंजेक्शन**               | **ORM with Parameterized Queries**         | SQLAlchemy जैसे ORM का उपयोग करें। यह स्वचालित रूप से उपयोगकर्ता इनपुट को सैनिटाइज करता है और रॉ SQL स्ट्रिंग्स के बजाय पैरामीटराइज्ड क्वेरीज का उपयोग करके SQL इंजेक्शन को रोकता है।                                                                                                 |
| **Cross-Site Scripting (XSS)** | **Input Validation & Output Encoding**     | FastAPI में सभी इनकमिंग डेटा को मान्य (validate) करने के लिए Pydantic मॉडल का सख्ती से उपयोग करें। फ्रंटएंड (React) स्वचालित रूप से अधिकांश XSS से बचाता है, लेकिन `dangerouslySetInnerHTML` का उपयोग करने से बचें।                                                                   |
| **संवेदनशील डेटा एक्सपोजर**    | **Encryption at Rest & Secret Management** | डेटाबेस में MT5 पासवर्ड और API कुंजियों जैसे संवेदनशील डेटा को स्टोर करने के लिए `pgcrypto` एक्सटेंशन का उपयोग करें। `JWT_SECRET`, `DATABASE_URL` जैसे रहस्यों को कभी भी कोड में हार्डकोड न करें; इसके बजाय पर्यावरण चर (environment variables) और `pydantic-settings` का उपयोग करें। |
| **DDoS और वेब हमले**           | **Web Application Firewall (WAF)**         | अपने एप्लिकेशन को **Cloudflare** जैसे WAF के पीछे रखें। यह सामान्य वेब कमजोरियों (जैसे OWASP टॉप 10) के खिलाफ एक अतिरिक्त सुरक्षा परत और DDoS शमन प्रदान करता है।                                                                                                                     |

​
