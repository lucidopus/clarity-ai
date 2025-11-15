# Cost Tracking Documentation

## Overview

Clarity AI implements comprehensive cost tracking for all third-party API usage, including:
- **Groq LLM**: Token-based pricing for AI-generated learning materials
- **Apify Transcript Extraction**: Fixed-cost transcript retrieval from YouTube videos

All API costs are automatically logged to the MongoDB `costs` collection during video processing, enabling future cost analysis, billing dashboards, and per-user usage reporting.

---

## Architecture

### Model-Based Pricing Dictionary

The cost tracking system uses a **model-based pricing dictionary** that supports any LLM provider (Groq, OpenAI, Anthropic, Google, etc.) with **zero code changes**.

**Key Features**:
- Single `LLM_MODEL` environment variable maps directly to a pricing dictionary key
- Adding a new model requires only one line in the config dictionary
- Switching providers/models requires only updating the environment variable
- No hardcoded model names in business logic

**Location**: `lib/cost/config.ts`

```typescript
// Model-based pricing dictionary
export const costs_per_model: Record<string, ITokenCostConfig> = {
  // OpenAI GPT-OSS 120B (via Groq)
  'openai/gpt-oss-120b': {
    inputTokensCost: 0.15,    // per million tokens
    outputTokensCost: 0.60,   // per million tokens
  },

  // Meta Llama 3.3 70B Versatile (via Groq)
  'llama-3.3-70b-versatile': {
    inputTokensCost: 0.59,
    outputTokensCost: 0.79,
  },

  // Alibaba Qwen3 32B (via Groq)
  'qwen/qwen3-32b': {
    inputTokensCost: 0.29,
    outputTokensCost: 0.59,
  },
};
```

---

## Data Model

### Cost Schema

**Collection**: `costs`

**Indexes**:
- `{ userId: 1, createdAt: -1 }` - User-specific cost queries sorted by date
- `{ videoId: 1 }` - Video-specific cost aggregation
- `{ 'services.service': 1 }` - Service-specific analytics
- `{ createdAt: -1 }` - Time-based queries

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique cost record identifier |
| `userId` | ObjectId | User who triggered the generation (ref: User) |
| `videoId` | ObjectId | Associated video (ref: Video, optional) |
| `transcriptId` | ObjectId | Associated transcript (optional) |
| `services` | Array<IServiceUsage> | Array of service usage records |
| `totalCost` | Number | Denormalized total cost (sum of all services, USD) |
| `createdAt` | Date | Timestamp when cost was logged |
| `updatedAt` | Date | Auto-updated timestamp |

### Service Usage Object

```typescript
interface IServiceUsage {
  service: ServiceType;           // 'groq_llm' | 'apify_transcript'
  usage: {
    cost: number;                 // Cost in USD
    unitDetails: IUnitDetails;    // Service-specific details
  };
  status: 'success' | 'failed';   // API call status
  errorMessage?: string;          // Error details if failed
}
```

### Unit Details Object

```typescript
interface IUnitDetails {
  // LLM-specific fields (optional)
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;

  // Duration tracking (optional)
  duration?: number;              // in milliseconds

  // Flexible metadata (optional)
  metadata?: Record<string, any>; // Service-specific data
}
```

---

## Example Cost Records

### Successful Video Generation

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "videoId": "507f1f77bcf86cd799439012",
  "services": [
    {
      "service": "apify_transcript",
      "usage": {
        "cost": 0.005,
        "unitDetails": {
          "duration": 1245,
          "metadata": {
            "segmentCount": 156,
            "characterCount": 12450
          }
        }
      },
      "status": "success"
    },
    {
      "service": "groq_llm",
      "usage": {
        "cost": 0.001784,
        "unitDetails": {
          "inputTokens": 4521,
          "outputTokens": 1843,
          "totalTokens": 6364,
          "metadata": {
            "model": "openai/gpt-oss-120b",
            "flashcardsGenerated": 12,
            "quizzesGenerated": 8,
            "timestampsGenerated": 15,
            "prerequisitesGenerated": 5
          }
        }
      },
      "status": "success"
    }
  ],
  "totalCost": 0.006784,
  "createdAt": "2025-01-15T10:30:45.123Z",
  "updatedAt": "2025-01-15T10:30:45.123Z"
}
```

### Failed LLM Generation

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f191e810c19729de860ea",
  "videoId": "507f1f77bcf86cd799439014",
  "services": [
    {
      "service": "apify_transcript",
      "usage": {
        "cost": 0.005,
        "unitDetails": {
          "duration": 980
        }
      },
      "status": "success"
    },
    {
      "service": "groq_llm",
      "usage": {
        "cost": 0.0,
        "unitDetails": {
          "metadata": {
            "model": "openai/gpt-oss-120b"
          }
        }
      },
      "status": "failed",
      "errorMessage": "Rate limit exceeded"
    }
  ],
  "totalCost": 0.005,
  "createdAt": "2025-01-15T11:15:22.456Z",
  "updatedAt": "2025-01-15T11:15:22.456Z"
}
```

---

## Current Pricing Rates

### Groq LLM Models

All Groq models use token-based pricing (per million tokens):

| Model | Input Cost | Output Cost | Source |
|-------|-----------|-------------|--------|
| `openai/gpt-oss-120b` | $0.15/M | $0.60/M | [Groq Pricing](https://groq.com/pricing) |
| `llama-3.3-70b-versatile` | $0.59/M | $0.79/M | [Groq Pricing](https://groq.com/pricing) |
| `qwen/qwen3-32b` | $0.29/M | $0.59/M | [Groq Pricing](https://groq.com/pricing) |

**Cost Formula**:
```
LLM Cost = (inputTokens / 1,000,000) × inputCost + (outputTokens / 1,000,000) × outputCost
```

### Apify Transcript Extraction

**Fixed cost**: $0.005 per call (not model-based)

---

## Adding a New LLM Model

### Step 1: Add Model to Pricing Dictionary

Edit `lib/cost/config.ts` and add a new entry:

```typescript
export const costs_per_model: Record<string, ITokenCostConfig> = {
  // Existing models...

  // New model example: Claude 3 Opus
  'anthropic/claude-3-opus': {
    inputTokensCost: 15.0,   // $15 per million tokens
    outputTokensCost: 75.0,  // $75 per million tokens
  },
};
```

### Step 2: Update Environment Variable

Set `LLM_MODEL` to the new model key:

```bash
LLM_MODEL=anthropic/claude-3-opus
```

### Step 3: (Optional) Update SDK Configuration

If switching to a different provider (e.g., from Groq to Anthropic), you'll need to:
1. Install the provider's SDK (e.g., `@anthropic-ai/sdk`)
2. Update `lib/sdk.ts` to initialize the new client
3. Update `lib/llm.ts` to use the new client's API

**That's it!** No changes needed to cost calculation logic.

---

## Switching LLM Providers

### Example: Groq → OpenAI

**Before**:
```bash
LLM_MODEL=openai/gpt-oss-120b  # Groq's OpenAI model
```

**After**:
```bash
LLM_MODEL=openai/gpt-4o        # OpenAI's native model
```

**Required changes**:
1. Add `openai/gpt-4o` to `costs_per_model` dictionary
2. Update `LLM_MODEL` environment variable
3. Update SDK initialization in `lib/sdk.ts` to use OpenAI's SDK
4. Update `lib/llm.ts` to call OpenAI's API

**Cost calculation**: Automatic (no code changes needed)

---

## Integration Points

### Video Processing Pipeline

**Location**: `app/api/videos/process/route.ts`

**Cost tracking happens at two points**:

#### 1. After Transcript Extraction (Step 6)

```typescript
const apifyCost = calculateApifyCost();
services.push({
  service: ServiceType.APIFY_TRANSCRIPT,
  usage: {
    cost: apifyCost,
    unitDetails: {
      duration: transcriptDuration,
      metadata: { segmentCount, characterCount }
    }
  },
  status: 'success'
});
```

#### 2. After LLM Generation (Step 7)

```typescript
const llmCost = calculateLLMCost(llmUsage.promptTokens, llmUsage.completionTokens);
services.push({
  service: ServiceType.GROQ_LLM,
  usage: {
    cost: llmCost,
    unitDetails: {
      inputTokens: llmUsage.promptTokens,
      outputTokens: llmUsage.completionTokens,
      totalTokens: llmUsage.totalTokens,
      metadata: { model, flashcardsGenerated, quizzesGenerated, ... }
    }
  },
  status: 'success'
});
```

#### 3. Cost Logging (Step 11)

```typescript
const totalCost = calculateTotalCost(services);
await logGenerationCost({
  userId: decoded.userId,
  videoId: videoDoc._id,
  services,
  totalCost
});
```

**Error Handling**: Cost logging is **non-blocking** - failures are logged as warnings but don't fail the video processing request.

---

## Querying Cost Data

### Total Costs by User

```javascript
const userCosts = await Cost.aggregate([
  { $match: { userId: new ObjectId(userId) } },
  { $group: { _id: '$userId', totalSpent: { $sum: '$totalCost' } } }
]);
```

### Costs by Service Type

```javascript
const costsByService = await Cost.aggregate([
  { $unwind: '$services' },
  { $group: {
    _id: '$services.service',
    totalCost: { $sum: '$services.usage.cost' },
    count: { $sum: 1 }
  }}
]);
```

### Monthly Cost Breakdown

```javascript
const monthlyCosts = await Cost.aggregate([
  {
    $group: {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      },
      totalCost: { $sum: '$totalCost' },
      videosProcessed: { $sum: 1 }
    }
  },
  { $sort: { '_id.year': -1, '_id.month': -1 } }
]);
```

### Average Cost per Video

```javascript
const avgCost = await Cost.aggregate([
  { $match: { videoId: { $exists: true } } },
  { $group: { _id: null, avgCost: { $avg: '$totalCost' } } }
]);
```

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Pricing History Tracking**: Store historical pricing rates to calculate costs retroactively
2. **Cost Alerts**: Notify admins when costs exceed thresholds
3. **Per-User Billing**: Generate invoices based on cost records
4. **Cost Optimization**: Suggest cheaper models for similar quality
5. **Budget Limits**: Prevent generation when user exceeds budget
6. **Cost Prediction**: Estimate cost before processing based on transcript length

---

## Troubleshooting

### Cost Logging Failed (Non-Critical)

**Error**: `⚠️ [VIDEO PROCESS] Failed to log costs (non-critical)`

**Cause**: Database connection issue or schema validation error

**Impact**: Video processing succeeds, but cost record is not saved

**Solution**: Check MongoDB connection and Cost model validation

### LLM_MODEL Not Found in Dictionary

**Error**: `Model "xyz" not found in pricing dictionary`

**Cause**: `LLM_MODEL` environment variable points to a non-existent key

**Solution**: Add the model to `costs_per_model` in `lib/cost/config.ts` or fix the env var

### Invalid Token Counts

**Error**: `Token counts cannot be negative`

**Cause**: LLM API returned invalid usage data

**Solution**: Check LLM API response structure and error handling in `lib/llm.ts`

---

## References

- **Groq Pricing**: https://groq.com/pricing
- **Groq Structured Outputs**: https://console.groq.com/docs/structured-outputs
- **MongoDB Aggregation**: https://www.mongodb.com/docs/manual/aggregation/
- **Cost Model**: `lib/models/Cost.ts`
- **Cost Calculator**: `lib/cost/calculator.ts`
- **Cost Logger**: `lib/cost/logger.ts`
- **Cost Config**: `lib/cost/config.ts`
