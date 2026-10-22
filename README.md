# HI Grid — Solar Power System Simulator

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-0.165-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Discom_Net--Metering-INR_₹-F59E0B?style=for-the-badge" alt="Discom Net-Metering" />
  <img src="https://img.shields.io/badge/Vercel-Auto_Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

A professional, physics-grade computational photovoltaic (PV) simulation dashboard designed specifically for Indian rooftop solar conditions. Models flat RCC terrace installations, Discom net-metering tariffs, 3D sun trajectories with real-time shadow casting, and satellite solar radiation data from Open-Meteo.

---

## 🇮🇳 India-Specific Engineering & Financial Features

### 1. 🏢 Flat RCC Concrete Terrace 3D Architecture
- Replaced Western slanting/gabled roofs with authentic **Indian flat concrete terraces (chhat)**.
- Models 3-ft boundary parapet walls, staircase headroom (mumty room), overhead Sintex water tank, and elevated hot-dip galvanised iron (GI) strut mounting racks (elevated ~1m to avoid parapet shadows and preserve terrace walking space).
- Interactive 3D shadow raytracing showing sun trajectory from east to west across summer and winter seasons.

### 2. 🗺️ Interactive GPS Rooftop Pinpoint Map
- Integrated interactive **Leaflet / OpenStreetMap** map with live search for any Indian city, pin code, or locality.
- Click anywhere or drag the pin to set your exact rooftop GPS coordinates and fetch live local solar irradiance.

### 3. ⚡ Indian Discom Net-Metering & PM Surya Ghar Subsidy
- Pre-configured with major Indian Discom tariffs:
  - **BESCOM (Bengaluru)**: ₹7.50/unit retail, ₹3.20/unit export credit
  - **BSES (Delhi NCR)**: ₹8.20/unit retail, ₹3.50/unit export credit
  - **Tata Power / MSEDCL (Mumbai)**: ₹11.50/unit commercial tariff
  - **JVVNL (Jaipur/Rajasthan)**: ₹7.80/unit retail tariff
  - **UGVCL / Torrent (Ahmedabad/Gujarat)**: ₹8.50/unit industrial tariff
- 25-Year cumulative cash flow accounting for 3.5%/year Discom tariff escalation and 0.5%/year module degradation.
- Central Electricity Authority (CEA) carbon emission offset factor of **0.71 kg CO₂ / kWh**.

---

## 📐 Mathematical Formulation

### 1. Plane of Array (POA) Irradiance (Hay-Davies Model)
$$POA = I_{\text{beam}} + I_{\text{diffuse}} + I_{\text{ground}}$$
$$I_{\text{beam}} = DNI \cdot \max(0, \cos\theta)$$
$$I_{\text{diffuse}} = DHI \cdot \left[ A_i \frac{\cos\theta}{\cos\theta_z} + (1 - A_i) \left(\frac{1 + \cos\beta}{2}\right) \right]$$
$$I_{\text{ground}} = GHI \cdot \rho \cdot \left(\frac{1 - \cos\beta}{2}\right)$$

Where $\theta$ is Angle of Incidence (AOI), $\beta$ is panel tilt, $A_i = \frac{DNI}{1367}$ is the anisotropy index, and $\rho \approx 0.20$ is ground albedo.

### 2. Operating Cell Temperature (Sandia / King Model)
$$T_{\text{cell}} = T_{\text{amb}} + \left(\frac{POA}{800}\right) \cdot (NOCT - 20) \cdot e^{-0.05 \cdot v_{\text{wind}}}$$

### 3. PV Power Derating
$$P_{\text{dc}} = P_{\text{rated}} \cdot \left(\frac{POA}{1000}\right) \cdot \left[1 + \gamma \cdot (T_{\text{cell}} - 25^\circ\text{C})\right] \cdot \eta_{\text{derate}}$$

### 4. Levelized Cost of Energy (LCOE in ₹/kWh)
$$\text{LCOE} = \frac{\text{CAPEX} + \sum_{t=1}^{N} \frac{\text{OPEX}_t + \text{Inverter Replacement}}{(1 + r)^t}}{\sum_{t=1}^{N} \frac{E_t}{(1 + r)^t}}$$

---

## ⚡ Does It Automatically Update in Vercel?

**Yes! 🚀**
When your GitHub repository is connected to Vercel:
1. Every time you push a commit (`git push origin main`), GitHub immediately sends a webhook to Vercel.
2. Vercel automatically runs `npm run build` and deploys the new version globally across its Edge Network in ~30–45 seconds.
3. Your live URL is automatically updated with zero downtime and zero manual commands needed.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/Hitesh070/Solar-Power-System-Simulator.git
cd Solar-Power-System-Simulator

# Install dependencies
npm install

# Start local server
npm run dev

# Run physics validation test suite
npm test

# Build for production
npm run build
```

---

## 📄 License
Released under the [MIT License](LICENSE).
