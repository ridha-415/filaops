# Printer Overhead Cost Calculator

Understanding your true cost-per-hour helps with accurate quoting and profitability analysis.

## The Formula

```
Hourly Overhead = Depreciation + Electricity + Maintenance
```

### Component Breakdown

| Component | Formula | Example |
|-----------|---------|---------|
| **Depreciation** | (Printer Cost / Lifespan Years) / Annual Hours | ($1,200 / 3) / 6,000 = $0.067/hr |
| **Electricity** | Rate ($/kWh) × Power (kW) | $0.14 × 0.18 = $0.025/hr |
| **Maintenance** | Annual Maint. Budget / Annual Hours | $200 / 6,000 = $0.033/hr |
| **Total** | Sum of above | **~$0.125/hr** |

## Assumptions

These calculations assume:
- **Lifespan:** 3 years (conservative for production use)
- **Utilization:** ~70% uptime (6,000 hrs/year)
- **Power draw:** 150-200W average during print
- **Maintenance:** Nozzles, belts, build surfaces, fans

## Quick Reference Chart

| Printer Cost | Est. Overhead/Hour* |
|--------------|---------------------|
| $300 (Ender-style) | ~$0.06 |
| $600 (mid-range) | ~$0.09 |
| $1,200 (Bambu/Prusa) | ~$0.13 |
| $2,500 (industrial) | ~$0.22 |

*Includes depreciation, electricity, maintenance. Does not include filament, labor, or rent.

## What This Means for Pricing

Your **machine overhead** is typically only 5-15% of what you charge customers. The rest covers:

- Material costs (usually 30-50% of job cost)
- Labor & expertise (setup, post-processing)
- Business overhead (rent, insurance, software)
- Profit margin

## Example: Quoting a 10-Hour Print

| Cost Component | Calculation | Amount |
|----------------|-------------|--------|
| Machine overhead | 10 hrs × $0.13 | $1.30 |
| Filament (200g @ $20/kg) | 0.2 × $20 | $4.00 |
| Labor (15 min setup/finish) | 0.25 × $25/hr | $6.25 |
| **Cost basis** | | **$11.55** |
| Margin (40%) | | $4.62 |
| **Quote price** | | **$16.17** |

## Integration with FilaOps

In FilaOps, these costs flow through:

1. **Work Centers** - Define machine overhead rates
2. **Routings** - Assign operations to work centers with time estimates
3. **BOMs** - Combine material + routing costs
4. **Quotes** - Auto-calculate from BOM with margin

---

*Note: These are illustrative examples. Your actual costs will vary based on equipment, location, utilization, and operational efficiency. We recommend tracking actual costs quarterly and adjusting rates accordingly.*
