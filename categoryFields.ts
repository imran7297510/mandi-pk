export const CATEGORY_FIELDS: Record<string, {name: string, label: string, type: string, required?: boolean, options?: string[]}[]> = {
  'Vehicles': [
    { name: 'make', label: 'Make', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'bodyType', label: 'Body Type', type: 'select', options: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Truck', 'Van', 'Other'] },
    { name: 'color', label: 'Color', type: 'text' },
    { name: 'engineCapacity', label: 'Engine Capacity (cc)', type: 'text' },
    { name: 'mileage', label: 'Mileage', type: 'number' },
    { name: 'transmission', label: 'Transmission', type: 'select', options: ['Manual', 'Automatic'] },
    { name: 'fuelType', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'CNG', 'Hybrid', 'Electric'] },
    { name: 'numberOfSeats', label: 'Number of Seats', type: 'number' },
    { name: 'numberOfOwners', label: 'Number of Owners', type: 'number' },
    { name: 'registrationCity', label: 'Registration City', type: 'text' },
    { name: 'carDocuments', label: 'Documents', type: 'select', options: ['Complete', 'Duplicate', 'Missing'] },
    { name: 'assembly', label: 'Assembly', type: 'select', options: ['Local', 'Imported'] },
    { name: 'features', label: 'Features', type: 'text' }
  ],
  'Electronics': [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'ptaStatus', label: 'PTA Status', type: 'select', options: ['Approved', 'Not Approved'] },
    { name: 'storage', label: 'Storage', type: 'text' },
    { name: 'ram', label: 'RAM', type: 'text' },
    { name: 'accessoriesIncluded', label: 'Accessories Included', type: 'text' },
    { name: 'batteryHealth', label: 'Battery Health (%)', type: 'number' },
    { name: 'processor', label: 'Processor', type: 'text' },
    { name: 'graphicsCard', label: 'Graphics Card', type: 'text' },
    { name: 'screenSize', label: 'Screen Size', type: 'text' },
    { name: 'type', label: 'Type (e.g. LED, OLED, Smart TV)', type: 'text' }
  ],
  'Real Estate': [
    { name: 'propertyType', label: 'Property Type', type: 'select', options: ['House', 'Flat', 'Plot', 'Commercial'] },
    { name: 'purpose', label: 'Purpose', type: 'select', options: ['Sale', 'Rent'] },
    { name: 'area', label: 'Area (Sq Ft / Marla)', type: 'text', required: true },
    { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { name: 'furnishing', label: 'Furnishing', type: 'select', options: ['Furnished', 'Unfurnished'] },
    { name: 'parkingAvailability', label: 'Parking Availability', type: 'select', options: ['Yes', 'No'] },
    { name: 'locationDetails', label: 'Location Details', type: 'text' },
    { name: 'ownershipStatus', label: 'Documents / Ownership Status', type: 'text' },
    { name: 'possessionStatus', label: 'Possession Status', type: 'text' }
  ],
  'Fashion & Clothing': [
    { name: 'type', label: 'Type', type: 'select', options: ['Men', 'Women', 'Kids'] },
    { name: 'categoryType', label: 'Category', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'size', label: 'Size', type: 'text' },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'color', label: 'Color', type: 'text' }
  ],
  'Home & Living': [
    { name: 'itemType', label: 'Item Type', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'material', label: 'Material', type: 'text' },
    { name: 'dimensions', label: 'Dimensions', type: 'text' },
    { name: 'usageDuration', label: 'Usage Duration', type: 'text' }
  ],
  'Beauty & Personal Care': [
    { name: 'productType', label: 'Product Type', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'skinType', label: 'Skin Type', type: 'text' },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date' }
  ],
  'Sports & Fitness': [
    { name: 'equipmentType', label: 'Equipment Type', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'usageLevel', label: 'Usage Level', type: 'text' },
    { name: 'weightSize', label: 'Weight / Size', type: 'text' }
  ],
  'Baby & Kids': [
    { name: 'productType', label: 'Product Type', type: 'text' },
    { name: 'ageGroup', label: 'Age Group', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'safetyInfo', label: 'Safety Info', type: 'text' }
  ],
  'Business & Industrial': [
    { name: 'equipmentType', label: 'Equipment Type', type: 'text' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'powerRequirements', label: 'Power Requirements', type: 'text' },
    { name: 'usage', label: 'Usage', type: 'text' }
  ],
  'Services': [
    { name: 'serviceType', label: 'Service Type', type: 'text' },
    { name: 'experienceLevel', label: 'Experience Level', type: 'text' },
    { name: 'pricingType', label: 'Pricing Type', type: 'select', options: ['Hourly', 'Fixed'] },
    { name: 'serviceArea', label: 'Service Area', type: 'text' },
    { name: 'availability', label: 'Availability', type: 'text' }
  ],
  'Animals & Pets': [
    { name: 'animalType', label: 'Animal/Product Type', type: 'text' },
    { name: 'breed', label: 'Breed', type: 'text' },
    { name: 'age', label: 'Age', type: 'text' },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'] },
    { name: 'vaccinationStatus', label: 'Vaccination Status', type: 'text' },
    { name: 'healthCondition', label: 'Health Condition', type: 'text' },
    { name: 'brand', label: 'Brand (for products)', type: 'text' }
  ],
  'Hobbies & Collections': [
    { name: 'itemType', label: 'Item Type', type: 'text' },
    { name: 'brandAuthor', label: 'Brand / Author', type: 'text' },
    { name: 'edition', label: 'Edition', type: 'text' }
  ],
  'Food and Groceries': [
    { name: 'productType', label: 'Product Type', type: 'text' },
    { name: 'freshPackaged', label: 'Fresh / Packaged', type: 'select', options: ['Fresh', 'Packaged'] },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { name: 'quantity', label: 'Quantity', type: 'text' },
    { name: 'organicHomemade', label: 'Organic / Homemade', type: 'select', options: ['Yes', 'No'] }
  ],
  'Others': [
    { name: 'customField1', label: 'Custom Field 1', type: 'text' },
    { name: 'customField2', label: 'Custom Field 2', type: 'text' },
    { name: 'generalDescription', label: 'General Description', type: 'text' }
  ]
};
