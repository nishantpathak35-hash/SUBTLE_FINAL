import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // 1. Create default admin users
  await prisma.user.upsert({
    where: { email: 'admin@quantify.com' },
    update: { role: 'Admin' },
    create: {
      email: 'admin@quantify.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'Admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'nishantpathak35@gmail.com' },
    update: { role: 'Admin' },
    create: {
      email: 'nishantpathak35@gmail.com',
      password: hashedPassword,
      name: 'Nishant Pathak',
      role: 'Admin',
    },
  });

  const shouldReset = process.env.SEED_RESET === 'true';
  if (shouldReset) {
    console.log('Cleaning up existing data...');
    await prisma.itemStateRate.deleteMany({});
    await prisma.itemVendorMapping.deleteMany({});
    await prisma.vendorRate.deleteMany({});
    await prisma.itemMaster.deleteMany({});
    await prisma.state.deleteMany({});
  }

  const states = ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Gujarat'];
  
  console.log('Seeding states...');
  for (const stateName of states) {
    await prisma.state.upsert({
      where: { name: stateName },
      update: {},
      create: { name: stateName }
    });
  }

  // 3. Define the Master Dataset Structure
  interface SubCategory {
    name: string;
    items: string[];
    isDiscrete?: boolean;
  }

  interface Category {
    category: string;
    vendorType: string;
    subCategories: SubCategory[];
    isDiscrete?: boolean;
  }

  const masterData: Category[] = [
    {
      category: "Boards & Substrates",
      vendorType: "Carpenter",
      subCategories: [
        { name: "Commercial Plywood", items: ["6mm commercial plywood", "9mm commercial plywood", "12mm commercial plywood", "16mm commercial plywood", "19mm commercial plywood", "25mm commercial plywood"] },
        { name: "BWP Plywood", items: ["6mm BWP plywood", "9mm BWP plywood", "12mm BWP plywood", "16mm BWP plywood", "19mm BWP plywood"] },
        { name: "Blockboard", items: ["19mm blockboard", "25mm blockboard", "30mm blockboard"] },
        { name: "MDF", items: ["6mm plain MDF", "9mm plain MDF", "12mm plain MDF", "18mm plain MDF", "25mm plain MDF"] },
        { name: "HDHMR", items: ["6mm HDHMR", "9mm HDHMR", "12mm HDHMR", "18mm HDHMR", "25mm HDHMR"] },
        { name: "Particle Board", items: ["18mm plain particle board", "18mm prelam particle board", "25mm particle board"] },
        { name: "Cement Board", items: ["8mm cement board", "10mm cement board", "12mm cement board"] },
        { name: "Gypsum Board", items: ["9mm gypsum board", "12.5mm gypsum board", "15mm fire board", "12.5mm MR board"] }
      ]
    },
    {
      category: "Laminate / Veneer / Surface",
      vendorType: "Carpenter",
      subCategories: [
        { name: "Decorative Laminate", items: ["0.8mm laminate matte", "0.8mm laminate gloss", "1.0mm laminate matte", "1.0mm laminate textured", "1.0mm laminate suede", "postforming laminate"] },
        { name: "Solid Laminate", items: ["solid color laminate white", "solid color laminate grey", "solid color laminate black", "solid color laminate beige"] },
        { name: "Veneer", items: ["teak veneer", "oak veneer", "walnut veneer", "ash veneer", "engineered veneer"] },
        { name: "Edge Band", items: ["0.8mm PVC edge band", "1mm PVC edge band", "2mm PVC edge band", "ABS edge band"] },
        { name: "Acrylic Surface", items: ["high gloss acrylic panel", "acrylic sheet clear", "acrylic sheet opal", "acrylic mirror sheet"] },
        { name: "PU / Duco", items: ["PU painted MDF panel", "duco finished panel", "high gloss PU panel", "matt PU panel"] }
      ]
    },
    {
      category: "Hardware & Fittings",
      vendorType: "Hardware supplier",
      isDiscrete: true,
      subCategories: [
        { name: "Door Hardware", items: ["mortise lock", "cylindrical lock", "door closer", "floor spring", "tower bolt", "door stopper", "pull handle SS", "lever handle"] },
        { name: "Cabinet Hardware", items: ["soft close hinge", "normal hinge", "telescopic channel", "tandem channel", "lift-up fitting", "magnet catch", "wardrobe tube", "drawer lock"] },
        { name: "Glass Hardware", items: ["patch fitting", "top patch", "bottom patch", "D handle", "spider fitting", "shower hinge", "glass connector"] },
        { name: "Accessories", items: ["shelf bracket", "concealed bracket", "SS profile handle", "aluminium profile handle", "sliding kit", "folding fitting"] }
      ]
    },
    {
      category: "Flooring",
      vendorType: "Tile contractor",
      subCategories: [
        { name: "Tiles", items: ["600x600 vitrified tile", "600x1200 vitrified tile", "ceramic floor tile", "anti-skid tile", "parking tile"] },
        { name: "Stone", items: ["marble flooring", "granite flooring", "kotah stone", "quartz stone flooring"] },
        { name: "Wooden Flooring", items: ["8mm laminate wood floor", "12mm laminate wood floor", "engineered wood floor", "SPC flooring", "LVT plank"] },
        { name: "Carpet", items: ["carpet tile loop pile", "carpet tile cut pile", "broadloom carpet", "entrance mat"] },
        { name: "Industrial Flooring", items: ["epoxy coating", "self leveling epoxy", "PU flooring", "floor hardener"] }
      ]
    },
    {
      category: "Furniture - Modular",
      vendorType: "Furniture vendor",
      isDiscrete: true,
      subCategories: [
        { name: "Workstations", items: ["2 seater workstation", "4 seater workstation", "6 seater workstation", "1200 mm workstation", "1500 mm workstation"] },
        { name: "Storage", items: ["low height storage", "full height storage", "overhead cabinet", "base cabinet", "mobile pedestal"] },
        { name: "Tables", items: ["executive table", "manager table", "conference table", "meeting table", "training table", "side table"] },
        { name: "Special Units", items: ["reception counter", "pantry unit", "printer unit", "credenza", "back unit"] }
      ]
    },
    {
      category: "Electrical",
      vendorType: "Electrical contractor",
      subCategories: [
        { name: "Conduits", items: ["20mm PVC conduit", "25mm PVC conduit", "MS conduit", "flexible conduit"] },
        { name: "Wires", items: ["1.5 sqmm FRLS wire", "2.5 sqmm FRLS wire", "4 sqmm FRLS wire", "6 sqmm FRLS wire"] },
        { name: "Switches & Sockets", items: ["6A switch", "16A switch", "6A socket", "16A socket", "TV socket", "data outlet"], isDiscrete: true },
        { name: "DB & Protection", items: ["SPN DB", "TPN DB", "MCB", "RCCB", "isolator", "changeover"], isDiscrete: true },
        { name: "Raceways", items: ["cable tray", "perferated tray", "trunking", "floor box"] }
      ]
    },
    {
      category: "Lighting",
      vendorType: "Lighting vendor",
      isDiscrete: true,
      subCategories: [
        { name: "Indoor Lighting", items: ["LED panel light", "LED downlight", "COB light", "tube light", "spot light", "track light", "pendant light"] },
        { name: "Strip & Cove", items: ["LED strip light", "aluminium profile for strip", "driver for strip", "neon flex"] },
        { name: "Safety Lighting", items: ["emergency light", "exit sign", "step light"] }
      ]
    },
    {
      category: "HVAC",
      vendorType: "HVAC contractor",
      subCategories: [
        { name: "Ducting", items: ["GI duct", "pre-insulated duct", "flexible duct", "volume control damper"] },
        { name: "Grilles & Diffusers", items: ["square diffuser", "linear grille", "return air grille", "slot diffuser"] },
        { name: "Insulation", items: ["nitrile insulation", "rockwool insulation", "XLPE insulation"] },
        { name: "Copper & Drain", items: ["copper pipe", "drain pipe", "insulation tape", "cable for AC"] },
        { name: "Equipment", items: ["cassette AC", "split AC", "VRF indoor unit", "exhaust fan", "fresh air fan"], isDiscrete: true }
      ]
    },
    {
      category: "Plumbing & Sanitary",
      vendorType: "Plumbing contractor",
      subCategories: [
        { name: "Water Supply", items: ["CPVC pipe", "PPR pipe", "GI pipe", "ball valve", "gate valve"] },
        { name: "Drainage", items: ["UPVC pipe", "SWR pipe", "floor trap", "bottle trap", "nahani trap"] },
        { name: "Sanitary Ware", items: ["water closet", "wall hung WC", "urinal", "wash basin", "counter basin"], isDiscrete: true },
        { name: "CP Fittings", items: ["pillar cock", "angle valve", "mixer", "health faucet", "shower set"], isDiscrete: true },
        { name: "Accessories", items: ["soap dispenser", "paper holder", "towel ring", "grab bar", "jet spray"], isDiscrete: true }
      ]
    },
    {
      category: "Glass & Mirror",
      vendorType: "Glass vendor",
      subCategories: [
        { name: "Glass", items: ["8mm toughened glass", "10mm toughened glass", "12mm toughened glass", "laminated glass", "clear float glass", "reflective glass"] },
        { name: "Mirror", items: ["5mm plain mirror", "6mm plain mirror", "bronze mirror", "grey mirror", "LED mirror"], isDiscrete: true },
        { name: "Films", items: ["frosted film", "branding vinyl film", "one-way vision film", "solar film"] }
      ]
    },
    {
      category: "Metal & Aluminium",
      vendorType: "Metal vendor",
      subCategories: [
        { name: "MS Fabrication", items: ["MS frame", "MS partition frame", "MS leg frame", "laser cut screen", "MS railing"] },
        { name: "SS Work", items: ["SS cladding", "SS skirting", "SS handrail", "SS profile", "PVD coated SS sheet"] },
        { name: "Aluminium", items: ["aluminium partition section", "aluminium skirting", "aluminium profile", "window section", "sliding system"] }
      ]
    },
    {
      category: "Ceiling",
      vendorType: "Carpenter",
      subCategories: [
        { name: "False Ceiling", items: ["gypsum false ceiling", "MR gypsum ceiling", "fire rated ceiling", "bulkhead ceiling"] },
        { name: "Grid Ceiling", items: ["mineral fiber ceiling", "calcium silicate tile ceiling", "metal lay-in tile ceiling"] },
        { name: "Feature Ceiling", items: ["baffle ceiling", "wood finish ceiling", "linear metal ceiling", "stretch ceiling"] },
        { name: "Accessories", items: ["perimeter channel", "GI section", "ceiling suspension rod", "access panel"] }
      ]
    },
    {
      category: "Wall Finishes",
      vendorType: "Painting contractor",
      subCategories: [
        { name: "Wall Tiles", items: ["ceramic wall tile", "porcelain wall tile", "subway tile", "accent tile"] },
        { name: "Paneling", items: ["laminate wall panel", "veneer wall panel", "fluted panel", "charcoal panel", "WPC panel"] },
        { name: "Wall Covering", items: ["wallpaper", "fabric wall covering", "acoustic fabric panel", "3D wall panel"] },
        { name: "Stone Cladding", items: ["marble cladding", "granite cladding", "slate cladding", "stone veneer panel"] },
        { name: "Paint Finish", items: ["putty", "primer", "interior emulsion", "enamel paint", "texture paint"] }
      ]
    },
    {
      category: "Furniture - Loose",
      vendorType: "Furniture vendor",
      isDiscrete: true,
      subCategories: [
        { name: "Seating", items: ["visitor chair", "executive chair", "cafeteria chair", "bar stool", "lounge chair", "sofa single", "sofa three seater"] },
        { name: "Tables", items: ["coffee table", "center table", "nesting table", "side table", "dining table"] },
        { name: "Accessories", items: ["ottoman", "bench", "pouf"] }
      ]
    },
    {
      category: "Soft Furnishing",
      vendorType: "Soft furnishing vendor",
      subCategories: [
        { name: "Curtains", items: ["blackout curtain", "sheer curtain", "ripple fold curtain", "eyelet curtain"] },
        { name: "Blinds", items: ["roller blind", "zebra blind", "venetian blind", "vertical blind", "roman blind"] },
        { name: "Upholstery", items: ["fabric upholstery", "leatherette upholstery", "headboard upholstery", "acoustic upholstery panel"] }
      ]
    },
    {
      category: "Fire & Safety",
      vendorType: "Fire vendor",
      subCategories: [
        { name: "Fire Fighting", items: ["sprinkler pipe", "sprinkler head", "landing valve", "hose reel", "fire extinguisher"], isDiscrete: true },
        { name: "Fire Alarm", items: ["smoke detector", "heat detector", "manual call point", "hooter", "control module"], isDiscrete: true },
        { name: "Safety", items: ["fire signage", "glow signage", "panic bar", "fire door closer"], isDiscrete: true }
      ]
    },
    {
      category: "Signage & Branding",
      vendorType: "Signage vendor",
      isDiscrete: true,
      subCategories: [
        { name: "Reception Branding", items: ["acrylic letters", "SS letters", "backlit logo", "ACP signage"] },
        { name: "Wayfinding", items: ["room sign", "toilet sign", "direction sign", "floor directory"] },
        { name: "Graphics", items: ["sunboard print", "vinyl graphics", "glass branding film", "wall branding graphic"] }
      ]
    },
    {
      category: "Adhesives / Sealants / Consumables",
      vendorType: "Hardware supplier",
      subCategories: [
        { name: "Adhesives", items: ["tile adhesive", "wood adhesive", "contact adhesive", "construction adhesive", "epoxy adhesive"] },
        { name: "Sealants", items: ["silicone sealant", "PU sealant", "acrylic sealant", "fire sealant"] },
        { name: "Fasteners", items: ["drywall screw", "wood screw", "anchor fastener", "rawl plug", "nut bolt"] },
        { name: "Painting Consumables", items: ["sand paper", "masking tape", "roller", "brush", "putty blade"] },
        { name: "Misc Consumables", items: ["foam sheet", "bubble wrap", "protection film", "cleaning chemical"] }
      ]
    },
    {
      category: "Civil / Masonry / Waterproofing",
      vendorType: "Civil contractor",
      subCategories: [
        { name: "Masonry", items: ["AAC block wall", "red brick wall", "hollow block wall", "door opening making"] },
        { name: "Plaster & Screed", items: ["internal plaster", "external plaster", "floor screed", "IPS flooring"] },
        { name: "Waterproofing", items: ["toilet waterproofing", "terrace waterproofing", "chemical injection", "PU coating"] },
        { name: "Concrete", items: ["RCC pedestal", "PCC bed", "micro concrete", "grouting"] }
      ]
    },
    {
      category: "Acoustic Works",
      vendorType: "Acoustic vendor",
      subCategories: [
        { name: "Panels", items: ["fabric acoustic panel", "PET panel", "grooved acoustic panel", "perforated gypsum panel"] },
        { name: "Ceiling Acoustics", items: ["acoustic baffle", "acoustic cloud", "acoustic ceiling tile"] },
        { name: "Insulation", items: ["rockwool infill", "glass wool infill", "acoustic sealant"] }
      ]
    },
    {
      category: "Kitchen / Pantry / Washroom",
      vendorType: "Furniture vendor",
      subCategories: [
        { name: "Kitchen Hardware", items: ["SS sink", "pull out basket", "cutlery tray", "hydraulic hinge", "tandem basket"], isDiscrete: true },
        { name: "Countertops", items: ["granite countertop", "quartz countertop", "solid surface countertop", "vanity counter"] },
        { name: "Washroom Accessories", items: ["mirror cabinet", "soap dispenser", "hand dryer", "urinal divider"], isDiscrete: true }
      ]
    }
  ];

  // 4. Helper to determine Unit
  const getUnit = (category: string, subCategory: string, itemName: string) => {
    const nosKeywords = ['lock', 'closer', 'spring', 'bolt', 'stopper', 'handle', 'hinge', 'channel', 'fitting', 'catch', 'tube', 'bracket', 'kit', 'chair', 'table', 'workstation', 'storage', 'cabinet', 'pedestal', 'counter', 'unit', 'credenza', 'stool', 'sofa', 'ottoman', 'bench', 'pouf', 'switch', 'socket', 'outlet', 'db', 'mcb', 'rccb', 'isolator', 'changeover', 'box', 'light', 'sign', 'ac', 'fan', 'trap', 'closet', 'wc', 'urinal', 'basin', 'cock', 'valve', 'mixer', 'faucet', 'set', 'dispenser', 'holder', 'ring', 'bar', 'spray', 'extinguisher', 'detector', 'point', 'hooter', 'module', 'bar', 'sink', 'basket', 'tray'];
    const rftKeywords = ['profile', 'skirting', 'grille', 'tray', 'frame', 'railing', 'trunking', 'cove', 'edge band'];
    const mKeywords = ['pipe', 'conduit', 'wire', 'duct', 'insulation', 'tape', 'cable'];
    
    const lower = itemName.toLowerCase();
    if (nosKeywords.some(k => lower.includes(k))) return 'nos';
    if (rftKeywords.some(k => lower.includes(k))) return 'rft';
    if (mKeywords.some(k => lower.includes(k))) return 'm';
    return 'sqft';
  };

  // 5. Helper to determine Size/Thickness
  const getSize = (itemName: string) => {
    const match = itemName.match(/(\d+mm|\d+x\d+|\d+\.\d+mm)/i);
    return match ? match[0] : 'Standard';
  };

  // 6. Helper to determine Rate Band
  const getRateBand = (variant: string) => {
    if (variant === 'Standard') return 'Standard';
    if (variant === 'Premium') return 'Premium';
    if (variant === 'Heavy Duty') return 'Premium';
    return 'Standard';
  };

  const shouldSeedItems = process.env.SEED_ITEMS !== 'false';
  if (!shouldSeedItems) {
    console.log('SEED_ITEMS is not enabled. Skipping item master generation.');
    return;
  }

  const existingItemCount = await prisma.itemMaster.count();
  if (!shouldReset && existingItemCount > 0) {
    console.log(`Item master already has ${existingItemCount} records. Skipping item generation.`);
    return;
  }

  // 7. Generation Loop
  let totalCreated = 0;
  console.log('Starting massive item generation...');

  let globalItemCounter = 1;
  for (const cat of masterData) {
    for (const sub of cat.subCategories) {
      for (const baseItem of sub.items) {
        // Rule: Discrete items get 2 variants, others get 3
        const isDiscrete = cat.isDiscrete || sub.isDiscrete;
        const variants = isDiscrete ? ['Standard', 'Premium'] : ['Standard', 'Premium', 'Heavy Duty'];

        for (const variant of variants) {
          const itemCode = `ITEM-${(globalItemCounter++).toString().padStart(6, '0')}`;
          
          const description = `${baseItem} — ${variant}. ${variant === 'Standard' ? 'General interior use.' : variant === 'Premium' ? 'Premium grade suitable for high-end fitout.' : 'Heavy duty / commercial grade.'}`;
          
          const unit = getUnit(cat.category, sub.name, baseItem);
          const size = getSize(baseItem);
          const rateBand = getRateBand(variant);

          const createdItem = await prisma.itemMaster.create({
            data: {
              itemCode,
              name: `${baseItem} (${variant})`,
              category: cat.category,
              subCategory: sub.name,
              description,
              unit,
              materialMake: variant === 'Premium' ? 'Premium Brand' : 'Standard Brand',
              sizeThickness: size,
              finishColor: variant,
              applicationArea: variant === 'Standard' ? 'General' : variant === 'Premium' ? 'Premium Area' : 'High Traffic',
              vendorType: cat.vendorType,
              typicalRateBand: rateBand,
              status: 'Active',
            }
          });

          // Generate state-wise rates
          for (const state of states) {
            const baseRate = Math.floor(Math.random() * 500) + 50;
            const variance = 0.9 + (Math.random() * 0.2); // +/- 10%
            
            await prisma.itemStateRate.create({
              data: {
                itemId: createdItem.id,
                state: state,
                labourRate: Math.round(baseRate * 0.3 * variance),
                supplyOnlyRate: Math.round(baseRate * 0.7 * variance),
                supplyPlusInstallationRate: Math.round(baseRate * variance)
              }
            });
          }

          totalCreated++;
          if (totalCreated % 100 === 0) console.log(`Created ${totalCreated} items...`);
        }
      }
    }
  }

  console.log(`\nSUCCESS: Generated ${totalCreated} items across ${masterData.length} categories.`);
  console.log('Interior Industry Master Database is now live.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
