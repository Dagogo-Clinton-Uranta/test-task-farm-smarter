# Form Data Extraction Service

## Overview
The Form Data Extraction Service automatically extracts farmer data from form responses and creates/updates farmer records in the database. This service runs in two modes:
1. **Real-time extraction**: When a response is created or updated for a farmer form
2. **Background job**: Daily scheduled job to process any missed responses

## Features

### 1. Automatic Farmer Creation/Update
- Extracts data from form responses when `isFarmerForm: true`
- Maps form field names to farmer model fields
- Creates new farmer records or updates existing ones
- Checks for existing farmers by phone number or email

### 2. Duplicate Detection
- Finds existing farmers by:
  - Phone number (checks `phone`, `phoneNumber`, `phone_number` fields)
  - Email address
- Prevents duplicate farmer records

### 3. Smart Update Logic
- Only updates farmer if response is more recent than farmer's last update
- Preserves important fields like `farmerId`, `requests`, `repayments`, `availableBalance`, `riskScore`
- Updates all other fields from the latest response

### 4. Field Mapping
The service automatically maps form field names to farmer model fields:

| Form Field Name | Farmer Field |
|----------------|--------------|
| `first_name` | `firstName` |
| `last_name` | `lastName` |
| `other_names` | `otherNames` |
| `can_i_get_your_image` | `photo` |
| `phone_number` | `phone` |
| `email` | `email` |
| `gender` | `gender` |
| `age_range` | `age` |
| `marital_status` | `maritalStatus` |
| `no_of_spouses` | `noOfSpouse` |
| `no_of_children` | `noOfChildren` |
| `id_government_identification_type` | `identification` |
| `do_you_have_a_smartphone` | `smartphone` |
| `farming_type` | `farmingType` |
| `cropslivestock` | `cropsLivestock` |
| `farm_size_unit` | `farmSizeUnit` |
| `farm_size` | `farmSize` |
| `farm_location` | `farmLocationGPS`, `location` |
| `do_you_do_irrigation` | `usesIrrigation` |
| `do_you_have_insurance` | `hasInsurance` |
| `insurance_name` | `insuranceName` |
| `do_you_do_organic_farming` | `organicFarmingInterest` |
| `previous_production_tons` | `previousProduction` |
| `previous_chemical_used` | `previousChemicals` |
| `list_chemicals_used` | `chemicals` |
| `where_do_you_sell_inputs` | `sellLocation` |
| `inputs` | `input` |
| `farming_experience` | `farmingExperience` |
| `previous_costs` | `previousCosts` |
| `challenges` | `challengesText` |

### 5. Required Field Defaults
If required fields are missing, the service sets sensible defaults:
- `farmerId`: Generated from firstName_lastName_timestamp
- `name`: Combined firstName + lastName or "Unknown Farmer"
- `locationName`: From `location` or `farmLocationGPS` or "Unknown Location"
- `photo`: From `can_i_get_your_image` or empty string
- `farmingCrop`: From `farmingType` or `cropsLivestock` or "Unknown"
- `harvestPurpose`: "Not specified"
- `harvestSize`: "Not specified"
- `identification`: From `id_government_identification_type` or "No"
- `smartphone`: From `do_you_have_a_smartphone` or "No"
- `organicFarmingInterest`: From `do_you_do_organic_farming` or "No"
- `noOfChildren`: 0
- `noOfSpouse`: 0
- `availableBalance`: 0
- `riskScore`: 0
- `pre_retailer`: "No"
- `requests`: []
- `repayments`: []

## Implementation

### Service Files

#### 1. `form-data-extraction.service.ts`
Main service that handles:
- `extractFormDataFromResponse(responseId)`: Extract data from a single response
- `extractFormDataFromAllResponses()`: Process all responses for farmer forms

#### 2. `background-job.service.ts`
Background job scheduler:
- `startFarmerExtractionJob()`: Starts daily job (runs at 2:00 AM)
- `stopFarmerExtractionJob()`: Stops the scheduled job
- `triggerFarmerExtraction()`: Manually trigger extraction
- `initializeBackgroundJobs()`: Initialize all background jobs
- `shutdownBackgroundJobs()`: Shutdown all background jobs

### Integration Points

#### 1. Response Creation
When a response is created (`POST /api/responses`):
- After successful response creation, automatically extracts farmer data
- Errors in extraction don't fail the response creation

#### 2. Response Update
When a response is updated (`PUT /api/responses/:id/update-response`):
- After successful response update, automatically extracts farmer data
- Updates farmer if response is more recent

#### 3. Background Job
- Runs daily at 2:00 AM (Africa/Lagos timezone)
- Processes all responses from farmer forms
- Only updates farmers if response is more recent than farmer's last update

### API Endpoints

#### Manual Trigger
```
POST /api/form-extraction/trigger
```
- **Auth**: Admin only
- **Description**: Manually trigger farmer data extraction for all responses
- **Response**: Statistics (processed, created, updated, errors)

## Usage

### Automatic Extraction
No action needed! The service automatically:
1. Extracts data when responses are created/updated
2. Runs daily background job to catch missed responses

### Manual Trigger
Admins can manually trigger extraction:
```bash
POST /api/form-extraction/trigger
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "message": "Farmer data extraction completed successfully",
  "data": {
    "processed": 150,
    "created": 45,
    "updated": 100,
    "errors": 5
  }
}
```

## Logging

The service logs:
- Info: Successful extractions, job starts/completions
- Warning: Skipped responses (not farmer form, already processed)
- Error: Extraction failures (logged but don't fail the request)

## Error Handling

- Extraction errors are logged but don't fail response creation/update
- Background job errors are logged and job continues
- Missing fields are handled with defaults
- Invalid data is skipped with warnings

## Dependencies

- `node-cron`: For scheduled background jobs
- `mongoose`: For database operations
- `winston`: For logging

## Configuration

### Background Job Schedule
Default: Daily at 2:00 AM (Africa/Lagos timezone)

To change the schedule, edit `background-job.service.ts`:
```typescript
// Current: '0 2 * * *' (2:00 AM daily)
// Format: 'minute hour day month dayOfWeek'
cron.schedule('0 2 * * *', async () => {
  // ...
}, {
  timezone: 'Africa/Lagos', // Change timezone as needed
});
```

## Future Enhancements

1. **Batch Processing**: Process responses in batches for better performance
2. **Retry Logic**: Retry failed extractions
3. **Webhook Support**: Notify external systems when farmers are created/updated
4. **Data Validation**: Enhanced validation before creating/updating farmers
5. **Conflict Resolution**: Handle cases where multiple responses update the same farmer
