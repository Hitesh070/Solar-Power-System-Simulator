import { PVSystemConfig, LocationData } from '../types/solar';

export interface SystemPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: PVSystemConfig;
  location: LocationData;
}

export const PRESETS: SystemPreset[] = [
  {
    id: 'bengaluru-residential-3kw',
    name: 'Bengaluru Villa Terrace (3 kWp)',
    badge: 'PM Surya Ghar',
    description: '3 kWp mono PERC array with BESCOM net-metering. Ideal for 2-3 BHK homes in South India.',
    location: {
      name: 'Bengaluru, Karnataka, India',
      latitude: 12.9716,
      longitude: 77.5946,
      state: 'Karnataka',
      country: 'India',
    },
    config: {
      systemCapacityKw: 3.3,
      panelTiltDeg: 14, // Latitude of Bangalore ~13°
      panelAzimuthDeg: 180, // Facing True South
      panelEfficiencyPercent: 21.2,
      tempCoefficientPmax: -0.35,
      systemLossesPercent: 14,
      inverterCapacityKw: 3.0,
      inverterEfficiencyPercent: 97.5,
      hasBattery: false,
      batteryCapacityKwh: 0,
      batteryMaxPowerKw: 0,
      batteryRoundTripEfficiency: 0.90,
      batteryMinSocPercent: 15,
      dailyConsumptionKwh: 14, // ~420 units/month
      loadProfileType: 'residential',
      gridElectricityRateInr: 7.50, // BESCOM ~₹7.50/unit
      feedInTariffInr: 3.20, // Net metering export credit
      systemCostInr: 175000, // ₹1.75 Lakh (before ₹78,000 PM Surya Ghar subsidy)
      annualDegradationPercent: 0.5,
    },
  },
  {
    id: 'delhi-rooftop-5kw',
    name: 'Delhi NCR Rooftop (5 kWp)',
    badge: 'Popular',
    description: '5 kWp grid-tied flat RCC roof installation with BSES net metering, high summer generation.',
    location: {
      name: 'New Delhi, Delhi, India',
      latitude: 28.6139,
      longitude: 77.209,
      state: 'Delhi',
      country: 'India',
    },
    config: {
      systemCapacityKw: 5.4,
      panelTiltDeg: 28, // Latitude of Delhi ~28.6°
      panelAzimuthDeg: 180,
      panelEfficiencyPercent: 21.5,
      tempCoefficientPmax: -0.34,
      systemLossesPercent: 15,
      inverterCapacityKw: 5.0,
      inverterEfficiencyPercent: 98.0,
      hasBattery: false,
      batteryCapacityKwh: 0,
      batteryMaxPowerKw: 0,
      batteryRoundTripEfficiency: 0.90,
      batteryMinSocPercent: 15,
      dailyConsumptionKwh: 24, // ~720 units/month (high AC load)
      loadProfileType: 'residential',
      gridElectricityRateInr: 8.20, // BSES tariff slab
      feedInTariffInr: 3.50,
      systemCostInr: 275000, // ₹2.75 Lakh
      annualDegradationPercent: 0.5,
    },
  },
  {
    id: 'jaipur-hybrid-10kw',
    name: 'Jaipur Solar + Battery Storage (10 kWp)',
    badge: 'High Yield',
    description: '10 kWp hybrid system with 15 kWh lithium battery backup in Rajasthan high-DNI desert belt.',
    location: {
      name: 'Jaipur, Rajasthan, India',
      latitude: 26.9124,
      longitude: 75.7873,
      state: 'Rajasthan',
      country: 'India',
    },
    config: {
      systemCapacityKw: 10.0,
      panelTiltDeg: 26,
      panelAzimuthDeg: 180,
      panelEfficiencyPercent: 21.5,
      tempCoefficientPmax: -0.35,
      systemLossesPercent: 13,
      inverterCapacityKw: 10.0,
      inverterEfficiencyPercent: 98.2,
      hasBattery: true,
      batteryCapacityKwh: 15.0,
      batteryMaxPowerKw: 5.0,
      batteryRoundTripEfficiency: 0.90,
      batteryMinSocPercent: 15,
      dailyConsumptionKwh: 45,
      loadProfileType: 'evening-heavy',
      gridElectricityRateInr: 7.80,
      feedInTariffInr: 3.10,
      systemCostInr: 680000, // ₹6.80 Lakh turnkey
      annualDegradationPercent: 0.45,
    },
  },
  {
    id: 'mumbai-commercial-25kw',
    name: 'Mumbai Commercial Rooftop (25 kWp)',
    badge: 'Commercial',
    description: '25 kWp array for commercial building with daytime HVAC load and high industrial tariff.',
    location: {
      name: 'Mumbai, Maharashtra, India',
      latitude: 19.076,
      longitude: 72.8777,
      state: 'Maharashtra',
      country: 'India',
    },
    config: {
      systemCapacityKw: 25.0,
      panelTiltDeg: 19,
      panelAzimuthDeg: 180,
      panelEfficiencyPercent: 21.8,
      tempCoefficientPmax: -0.34,
      systemLossesPercent: 13,
      inverterCapacityKw: 22.0,
      inverterEfficiencyPercent: 98.4,
      hasBattery: false,
      batteryCapacityKwh: 0,
      batteryMaxPowerKw: 0,
      batteryRoundTripEfficiency: 0.90,
      batteryMinSocPercent: 15,
      dailyConsumptionKwh: 140,
      loadProfileType: 'commercial',
      gridElectricityRateInr: 11.50, // MSEDCL/Tata Power commercial tariff
      feedInTariffInr: 3.80,
      systemCostInr: 1250000, // ₹12.50 Lakh
      annualDegradationPercent: 0.45,
    },
  },
  {
    id: 'ahmedabad-industrial-50kw',
    name: 'Ahmedabad Industrial Facility (50 kWp)',
    badge: 'Industrial',
    description: '50 kWp rooftop installation with 3-phase string inverter for manufacturing/warehouse.',
    location: {
      name: 'Ahmedabad, Gujarat, India',
      latitude: 23.0225,
      longitude: 72.5714,
      state: 'Gujarat',
      country: 'India',
    },
    config: {
      systemCapacityKw: 50.0,
      panelTiltDeg: 23,
      panelAzimuthDeg: 180,
      panelEfficiencyPercent: 22.0,
      tempCoefficientPmax: -0.33,
      systemLossesPercent: 12,
      inverterCapacityKw: 45.0,
      inverterEfficiencyPercent: 98.5,
      hasBattery: false,
      batteryCapacityKwh: 0,
      batteryMaxPowerKw: 0,
      batteryRoundTripEfficiency: 0.90,
      batteryMinSocPercent: 15,
      dailyConsumptionKwh: 320,
      loadProfileType: 'commercial',
      gridElectricityRateInr: 8.50, // UGVCL / Torrent Power
      feedInTariffInr: 3.50,
      systemCostInr: 2200000, // ₹22.00 Lakh
      annualDegradationPercent: 0.45,
    },
  },
];
