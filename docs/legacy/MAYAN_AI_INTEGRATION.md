# Mayan EDMS + OpenAI Integration Guide

## Architecture Overview

```
┌─────────────────┐
│   User Uploads  │
│    Document     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Mayan EDMS                  │
│  ┌──────────────────────────────┐   │
│  │  1. Document Stored          │   │
│  │  2. OCR Extracts Text        │   │
│  │  3. Trigger Webhook          │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│    Your NestJS API (Middleware)     │
│  ┌──────────────────────────────┐   │
│  │  AI Processing Service       │   │
│  │  - Receives webhook          │   │
│  │  - Calls OpenAI API          │   │
│  │  - Updates Mayan metadata    │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         OpenAI API                  │
│  - GPT-4 for classification         │
│  - GPT-4 for extraction             │
│  - Embeddings for search            │
│  - Vision for image analysis        │
└─────────────────────────────────────┘
```

---

## Features Implementation

### Feature 1: Auto-Classification

**Flow:**
1. User uploads document to Mayan
2. Mayan extracts text via OCR
3. Webhook triggers your API
4. Your API sends text to OpenAI
5. OpenAI classifies document type
6. Your API updates Mayan metadata

**Code:**

```typescript
// apps/api/src/documents/ai-processor.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';

@Injectable()
export class AIDocumentProcessor {
  private openai: OpenAI;
  private mayanApiUrl = process.env.MAYAN_API_URL;
  private mayanApiKey = process.env.MAYAN_API_KEY;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Auto-classify document type using GPT-4
   */
  async classifyDocument(documentId: number, textContent: string) {
    const prompt = `Analyze this document and classify it into ONE of these categories:
    
CATEGORIES:
- QUOTATION: Customer quotation, price quote, proposal
- PURCHASE_ORDER: Purchase order from customer or to vendor
- INVOICE: Invoice, bill, payment request
- CONTRACT: Service contract, agreement, MOU
- TECHNICAL_DRAWING: Engineering drawing, CAD file, blueprint
- SPECIFICATION: Technical specification, datasheet
- REPORT: Test report, inspection report, quality report
- CORRESPONDENCE: Email, letter, memo
- OTHER: Any other document type

DOCUMENT TEXT:
${textContent.substring(0, 3000)}

Respond with ONLY the category name and confidence (0-1):
Format: CATEGORY|CONFIDENCE|REASON

Example: QUOTATION|0.95|Contains price list and validity period`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const result = response.choices[0].message.content.split('|');
    const category = result[0];
    const confidence = parseFloat(result[1]);
    const reason = result[2];

    // Update Mayan document type
    await this.updateMayanDocumentType(documentId, category);

    // Store AI analysis in metadata
    await this.updateMayanMetadata(documentId, {
      ai_classification: category,
      ai_confidence: confidence,
      ai_reason: reason,
    });

    return { category, confidence, reason };
  }

  /**
   * Extract structured data from document
   */
  async extractMetadata(documentId: number, textContent: string, documentType: string) {
    let extractionPrompt = '';

    switch (documentType) {
      case 'QUOTATION':
        extractionPrompt = `Extract the following information from this quotation:
        
REQUIRED FIELDS:
- quotation_number: The quotation/reference number
- customer_name: Customer or company name
- date: Document date (YYYY-MM-DD)
- validity: Valid until date (YYYY-MM-DD)
- total_amount: Total amount with currency
- items: List of quoted items with quantities
- payment_terms: Payment terms mentioned
- delivery_time: Delivery or lead time
- contact_person: Contact person name
- contact_email: Email address
- contact_phone: Phone number

DOCUMENT TEXT:
${textContent.substring(0, 4000)}

Respond in JSON format ONLY. If field not found, use null.`;
        break;

      case 'PURCHASE_ORDER':
        extractionPrompt = `Extract from this purchase order:
        
- po_number
- vendor_name
- po_date
- delivery_date
- total_amount
- items (array of {item_name, quantity, unit_price})
- shipping_address
- billing_address
- payment_terms`;
        break;

      case 'INVOICE':
        extractionPrompt = `Extract from this invoice:
        
- invoice_number
- invoice_date
- due_date
- customer_name
- total_amount
- tax_amount
- items (array)
- payment_method
- bank_details`;
        break;

      case 'CONTRACT':
        extractionPrompt = `Extract from this contract:
        
- contract_number
- parties (array of company names)
- start_date
- end_date
- contract_value
- payment_schedule
- renewal_terms
- termination_clause
- governing_law`;
        break;

      default:
        return null;
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a document data extraction expert. Always respond with valid JSON.',
        },
        { role: 'user', content: extractionPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const extractedData = JSON.parse(response.choices[0].message.content);

    // Update Mayan with extracted metadata
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== null) {
        await this.updateMayanMetadata(documentId, { [key]: value });
      }
    }

    return extractedData;
  }

  /**
   * Generate document summary
   */
  async generateSummary(documentId: number, textContent: string) {
    const prompt = `Summarize this document in 3-4 sentences. Focus on:
- What type of document is this?
- Key parties involved
- Main purpose/content
- Important dates or amounts

DOCUMENT:
${textContent.substring(0, 5000)}

Provide a concise professional summary.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const summary = response.choices[0].message.content;

    await this.updateMayanMetadata(documentId, {
      ai_summary: summary,
    });

    return summary;
  }

  /**
   * Extract entities (companies, people, amounts, dates)
   */
  async extractEntities(textContent: string) {
    const prompt = `Extract all entities from this document:

ENTITY TYPES:
- COMPANIES: All company/organization names
- PEOPLE: All person names
- AMOUNTS: All monetary amounts with currency
- DATES: All dates (convert to YYYY-MM-DD)
- PRODUCTS: Product names, model numbers, item codes
- LOCATIONS: Cities, countries, addresses

DOCUMENT:
${textContent.substring(0, 4000)}

Respond in JSON:
{
  "companies": ["ABC Corp", "XYZ Ltd"],
  "people": ["John Smith", "Jane Doe"],
  "amounts": [{"value": 50000, "currency": "USD"}],
  "dates": ["2025-01-15", "2025-02-01"],
  "products": ["Model X-100", "Part #12345"],
  "locations": ["Dubai, UAE", "Mumbai, India"]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Approval recommendation based on content analysis
   */
  async getApprovalRecommendation(textContent: string, documentType: string) {
    const prompt = `Analyze this ${documentType} and provide approval recommendations:

ANALYSIS REQUIRED:
1. Risk Level (LOW/MEDIUM/HIGH)
2. Required Approvers (based on amount, type, risk)
3. Compliance Issues (any policy violations or concerns)
4. Recommended Actions
5. Priority (URGENT/HIGH/NORMAL/LOW)

COMPANY POLICIES:
- Quotations > $50,000 require Director approval
- Contracts require Legal review
- Purchase Orders > $100,000 require CEO approval
- Technical drawings require Engineering Manager approval

DOCUMENT:
${textContent.substring(0, 4000)}

Respond in JSON format with structured recommendations.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Check for duplicate documents using embeddings
   */
  async findSimilarDocuments(textContent: string, documentId: number) {
    // Generate embedding for current document
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textContent.substring(0, 8000),
    });

    const currentEmbedding = embeddingResponse.data[0].embedding;

    // Store embedding in your database
    await this.prisma.documentEmbedding.upsert({
      where: { mayan_document_id: documentId },
      create: {
        mayan_document_id: documentId,
        embedding: currentEmbedding,
        text_content: textContent.substring(0, 1000),
      },
      update: {
        embedding: currentEmbedding,
        text_content: textContent.substring(0, 1000),
      },
    });

    // Find similar documents using vector similarity
    // (requires pgvector extension in PostgreSQL)
    const similarDocs = await this.prisma.$queryRaw`
      SELECT 
        mayan_document_id,
        text_content,
        1 - (embedding <=> ${currentEmbedding}::vector) as similarity
      FROM document_embeddings
      WHERE mayan_document_id != ${documentId}
      ORDER BY embedding <=> ${currentEmbedding}::vector
      LIMIT 5
    `;

    return similarDocs.filter((doc: any) => doc.similarity > 0.85); // 85% similarity threshold
  }

  /**
   * Semantic search across documents
   */
  async semanticSearch(query: string) {
    // Generate embedding for search query
    const queryEmbedding = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = queryEmbedding.data[0].embedding;

    // Vector similarity search
    const results = await this.prisma.$queryRaw`
      SELECT 
        mayan_document_id,
        text_content,
        1 - (embedding <=> ${embedding}::vector) as relevance
      FROM document_embeddings
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT 20
    `;

    return results;
  }

  /**
   * Analyze document with GPT-4 Vision (for scanned images)
   */
  async analyzeDocumentImage(imageUrl: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this document image and extract:
1. Document type
2. Key information (numbers, dates, amounts)
3. Text content (transcribe all visible text)
4. Any stamps, signatures, or special markings

Provide structured JSON output.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Helper methods
  private async updateMayanDocumentType(documentId: number, category: string) {
    // Map AI category to Mayan document type ID
    const typeMapping = {
      QUOTATION: 1,
      PURCHASE_ORDER: 2,
      INVOICE: 3,
      CONTRACT: 4,
      TECHNICAL_DRAWING: 5,
      // ... etc
    };

    await axios.patch(
      `${this.mayanApiUrl}/documents/${documentId}/`,
      { document_type: typeMapping[category] },
      {
        headers: {
          Authorization: `Token ${this.mayanApiKey}`,
        },
      }
    );
  }

  private async updateMayanMetadata(documentId: number, metadata: any) {
    for (const [key, value] of Object.entries(metadata)) {
      await axios.post(
        `${this.mayanApiUrl}/documents/${documentId}/metadata/`,
        {
          metadata_type: key,
          value: String(value),
        },
        {
          headers: {
            Authorization: `Token ${this.mayanApiKey}`,
          },
        }
      );
    }
  }
}
```

---

## Webhook Handler (Receives from Mayan)

```typescript
// apps/api/src/documents/webhooks.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AIDocumentProcessor } from './ai-processor.service';

@Controller('webhooks/mayan')
export class MayanWebhooksController {
  constructor(private aiProcessor: AIDocumentProcessor) {}

  @Post('document-uploaded')
  async handleDocumentUploaded(@Body() payload: any) {
    const { document_id, text_content, image_url } = payload;

    try {
      // Step 1: Classify document
      const classification = await this.aiProcessor.classifyDocument(
        document_id,
        text_content
      );

      console.log('Document classified:', classification);

      // Step 2: Extract metadata based on type
      const metadata = await this.aiProcessor.extractMetadata(
        document_id,
        text_content,
        classification.category
      );

      console.log('Metadata extracted:', metadata);

      // Step 3: Generate summary
      const summary = await this.aiProcessor.generateSummary(
        document_id,
        text_content
      );

      // Step 4: Extract entities
      const entities = await this.aiProcessor.extractEntities(text_content);

      // Step 5: Find similar documents
      const duplicates = await this.aiProcessor.findSimilarDocuments(
        text_content,
        document_id
      );

      if (duplicates.length > 0) {
        console.log('⚠️  Possible duplicate documents found:', duplicates);
      }

      // Step 6: Get approval recommendation
      const approvalRec = await this.aiProcessor.getApprovalRecommendation(
        text_content,
        classification.category
      );

      // Step 7: If image document, analyze with Vision
      if (image_url) {
        const imageAnalysis = await this.aiProcessor.analyzeDocumentImage(image_url);
        console.log('Image analysis:', imageAnalysis);
      }

      return {
        success: true,
        classification,
        metadata,
        summary,
        entities,
        duplicates,
        approvalRec,
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return { success: false, error: error.message };
    }
  }
}
```

---

## Configure Mayan to Send Webhooks

```python
# In Mayan EDMS settings (via UI or Django admin)
# Setup → Webhooks → Create new webhook

Webhook URL: http://your-nestjs-api:4000/api/v1/webhooks/mayan/document-uploaded
Trigger Event: document.file.created
Method: POST
Payload:
{
  "document_id": "{{ document.pk }}",
  "text_content": "{{ document.latest_file.pages.first.content }}",
  "image_url": "{{ document.latest_file.pages.first.image_url }}",
  "filename": "{{ document.label }}"
}
```

---

## Database Schema for AI Features

```sql
-- Store document embeddings for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id SERIAL PRIMARY KEY,
  mayan_document_id INTEGER UNIQUE NOT NULL,
  embedding vector(1536), -- OpenAI embedding size
  text_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Store AI analysis results
CREATE TABLE document_ai_analysis (
  id SERIAL PRIMARY KEY,
  mayan_document_id INTEGER NOT NULL,
  classification VARCHAR(50),
  confidence DECIMAL(3,2),
  extracted_metadata JSONB,
  summary TEXT,
  entities JSONB,
  approval_recommendation JSONB,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Store duplicate detection results
CREATE TABLE document_duplicates (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  duplicate_of INTEGER NOT NULL,
  similarity_score DECIMAL(3,2),
  detected_at TIMESTAMP DEFAULT NOW()
);
```

---

## Smart Search API Endpoint

```typescript
// apps/api/src/documents/search.controller.ts
@Controller('documents/search')
export class DocumentSearchController {
  @Get('semantic')
  async semanticSearch(@Query('q') query: string) {
    // Natural language search
    // "Show me all quotations above 50k for UAE customers from last month"
    
    const results = await this.aiProcessor.semanticSearch(query);
    
    return {
      query,
      results: results.map(r => ({
        documentId: r.mayan_document_id,
        relevance: r.relevance,
        snippet: r.text_content
      }))
    };
  }

  @Get('intelligent')
  async intelligentSearch(@Query('q') query: string) {
    // Use GPT to understand query and build filters
    const prompt = `User search query: "${query}"
    
Convert this to structured search filters:
- document_type (quotation, invoice, contract, etc.)
- date_from / date_to
- amount_min / amount_max
- customer_name
- status
- tags

Respond in JSON with filters to apply.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const filters = JSON.parse(response.choices[0].message.content);
    
    // Apply filters to Mayan search API
    const results = await this.searchMayanWithFilters(filters);
    
    return { filters, results };
  }
}
```

---

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
MAYAN_API_URL=http://localhost:8000/api
MAYAN_API_KEY=your-mayan-api-token

# Optional: Use Azure OpenAI for government compliance
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=xxxxxxxxxxxxx
```

---

## Cost Estimation

### OpenAI API Costs (per document):

| Operation | Model | Cost per Doc |
|-----------|-------|--------------|
| Classification | GPT-4 Turbo | $0.01 |
| Metadata Extraction | GPT-4 Turbo | $0.02 |
| Summary | GPT-4 Turbo | $0.005 |
| Entities | GPT-4 Turbo | $0.01 |
| Embedding | text-embedding-3 | $0.0001 |
| Vision Analysis | GPT-4 Vision | $0.03 |
| **TOTAL per document** | | **~$0.08** |

**Monthly Cost:**
- 100 documents/month: $8
- 500 documents/month: $40
- 1000 documents/month: $80

**Very affordable for enterprise use!**

---

## Advanced Features

### 1. Auto-Linking Documents

```typescript
// Automatically link document to related entities
async autoLinkDocument(documentId: number, extractedData: any) {
  // If quotation number found, link to quotation
  if (extractedData.quotation_number) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { quotation_number: extractedData.quotation_number }
    });
    
    if (quotation) {
      await this.prisma.documentLink.create({
        data: {
          mayan_document_id: documentId,
          entity_type: 'quotation',
          entity_id: quotation.id
        }
      });
    }
  }
  
  // If customer name found, link to customer
  if (extractedData.customer_name) {
    const customer = await this.prisma.customer.findFirst({
      where: { 
        name: { contains: extractedData.customer_name, mode: 'insensitive' }
      }
    });
    
    if (customer) {
      await this.prisma.documentLink.create({
        data: {
          mayan_document_id: documentId,
          entity_type: 'customer',
          entity_id: customer.id
        }
      });
    }
  }
}
```

### 2. Anomaly Detection

```typescript
async detectAnomalies(documentData: any, documentType: string) {
  const prompt = `Analyze this ${documentType} for anomalies or issues:

CHECKS:
- Unusual amounts (too high/low)
- Missing required fields
- Inconsistent dates
- Mathematical errors
- Policy violations
- Red flags

DATA:
${JSON.stringify(documentData, null, 2)}

List any concerns found.`;

  const response = await this.openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }]
  });

  return response.choices[0].message.content;
}
```

### 3. Multi-Language Support

```typescript
async translateAndIndex(textContent: string, sourceLanguage: string) {
  // Translate to English for unified search
  const translation = await this.openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'user',
      content: `Translate this ${sourceLanguage} document to English:\n\n${textContent}`
    }]
  });

  const englishText = translation.choices[0].message.content;
  
  // Index both original and translated
  await this.indexDocument(textContent, sourceLanguage);
  await this.indexDocument(englishText, 'english');
}
```

---

## Dashboard Display

```typescript
// Frontend component to show AI insights
<DocumentCard document={doc}>
  <AIInsights>
    <Badge color="green">
      {doc.ai_classification} ({doc.ai_confidence * 100}%)
    </Badge>
    
    <Summary>{doc.ai_summary}</Summary>
    
    <MetadataGrid>
      <Field label="Customer">{doc.customer_name}</Field>
      <Field label="Amount">{doc.total_amount}</Field>
      <Field label="Date">{doc.date}</Field>
    </MetadataGrid>
    
    {doc.duplicates?.length > 0 && (
      <Alert type="warning">
        ⚠️ Similar document found: {doc.duplicates[0].document_id}
      </Alert>
    )}
    
    <ApprovalRecommendation>
      Risk: {doc.approval_rec.risk_level}
      Requires: {doc.approval_rec.required_approvers.join(', ')}
    </ApprovalRecommendation>
  </AIInsights>
</DocumentCard>
```

---

## Next Steps

1. **Add OpenAI package**: `pnpm add openai`
2. **Add pgvector extension**: For semantic search
3. **Create AI processor service**: Copy code above
4. **Configure Mayan webhook**: Point to your API
5. **Test with sample documents**: Upload quotation PDF
6. **Monitor costs**: OpenAI dashboard

**Want me to generate the complete implementation files now?**
