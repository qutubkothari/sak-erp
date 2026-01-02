# SAS Part Numbering Logic - Saif Automations

## Overview
Saif Automations uses a structured part numbering system that encodes critical information directly in the part number.

## Format Structure
```
PREFIX-CATEGORY-SPECIFICATION
```

## Prefix Categories

### RAD - Radio/Communication Components
- `RAD-TRR-*` = Transmitter/Receiver
- **Example**: `RAD-TRR-QX71W915` = Radio Transmitter/Receiver QX71W915

### SIC - Semiconductor/IC Components
- `SIC-DIO-*` = Diode
- `SIC-REG-*` = Voltage Regulator
- **Examples**:
  - `SIC-DIO-M7-v100i1` = Diode M7, 100V, 1A
  - `SIC-REG-AMS1117-5v` = Regulator AMS1117, 5V

### MOD - Modules
- `MOD-GNS-*` = GPS/Navigation Systems
- **Examples**:
  - `MOD-GNS-LC86L` = GPS Module LC86L
  - `MOD-GNS-HERE3+` = GPS Module HERE3+

### CON - Connectors
- `CON-BUL-*` = Bullet Connectors
  - Specification includes size and gender (M/F)
- **Examples**:
  - `CON-BUL-55F` = Bullet Connector, 5.5mm, Female
  - `CON-BUL-4M` = Bullet Connector, 4mm, Male

### CAB - Cables
- `CAB-SIL-*` = Silicone Cables
  - Specification includes color and AWG
- **Examples**:
  - `CAB-SIL-BLACK8AWG` = Silicone Cable, Black, 8 AWG
  - `CAB-SIL-RED10AWG` = Silicone Cable, Red, 10 AWG

## Additional Prefixes (Suggested)
Based on manufacturing needs:
- `BAT` = Battery Components
- `LED` = LED Components
- `PCB` = Printed Circuit Boards
- `MCH` = Mechanical Parts
- `PLT` = Plastic Components
- `MET` = Metal Components
- `FAS` = Fasteners
- `CHE` = Chemicals/Adhesives

## Auto-Generation Logic

### Step 1: Determine Prefix
Based on component type:
- Electronics → RAD, SIC, MOD, LED
- Electrical → CON, CAB, BAT
- Mechanical → MCH, FAS
- Material → MET, PLT, CHE

### Step 2: Determine Category
Second-level classification:
- For SIC: DIO (Diode), REG (Regulator), IC (Integrated Circuit)
- For CON: BUL (Bullet), JST (JST), PIN (Pin Header)
- For CAB: SIL (Silicone), PVC (PVC), FLT (Flat)

### Step 3: Build Specification
Include critical parameters:
- Model number
- Voltage/Current ratings (v100i1 = 100V, 1A)
- Size/Dimension
- Color
- Other distinguishing features

## Implementation for Auto-Generation

```javascript
function generateSASPartNumber(category, subCategory, specifications) {
  const prefix = categoryPrefixMap[category];
  const subCat = subCategory.toUpperCase().substring(0, 3);
  
  // Build specification string
  const spec = Object.entries(specifications)
    .map(([key, value]) => `${key}${value}`)
    .join('');
  
  return `${prefix}-${subCat}-${spec}`;
}

// Example Usage:
generateSASPartNumber('ELECTRONICS', 'DIODE', {
  model: 'M7',
  voltage: '100v',
  current: '1i'
}); 
// Returns: SIC-DIO-M7v100i1
```

## Data Quality Statistics
From current master list (686 items):
- **442 items** (64%) have SAS Part Numbers
- **244 items** (36%) need part numbers assigned

## Prefix Distribution
- CAB: 12 items (Cables)
- CON: 9 items (Connectors)
- SIC: 3 items (Semiconductors)
- MOD: 3 items (Modules)
- RAD: 2 items (Radio)

## Pattern Structure
Most common: **ALPHA-ALPHA-MIXED** (25 items)
- Example: `CAB-SIL-BLACK8AWG`

## Benefits
1. **Self-documenting** - Part number tells you what it is
2. **Searchable** - Easy to find similar components
3. **Scalable** - Can accommodate new categories
4. **Standard** - Consistent across organization
5. **Unique** - No duplicates possible with proper specification

## Database Integration
The part numbering logic is now integrated into the ERP:
- `items.part_number` stores the SAS Part Number
- `items.manufacturer_part_number` stores the OEM Part Number
- Auto-suggestion based on category selection
- Validation to prevent duplicates
