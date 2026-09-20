# SAK ONE — Integrated Business Operating System
## Development Specification for VS Code / AI Coding Agent

**Document purpose:**  
This is the development specification for **SAK ONE**, an integrated operating system to be built **inside the existing SAK ERP + CRM platform**.

The objective is not to create another disconnected application. The objective is to make the existing platform the **single source of truth** for the complete customer lifecycle:

**Lead → Opportunity → Requirement → Proposal → Order → Project → Implementation → Development → UAT → Go-Live → Support → Invoice → Collection → Renewal → Upsell**

---

# 1. Instructions to the Coding Agent

## 1.1 First action: inspect the existing codebase

Before writing production code:

1. Inspect the complete repository structure.
2. Identify:
   - frontend framework
   - backend framework
   - database
   - ORM / data-access layer
   - authentication mechanism
   - authorization / role model
   - current CRM entities
   - current ERP customer / account entities
   - current finance entities
   - current user / employee entities
   - current notification system
   - current document/file storage
   - current reporting/dashboard components
   - current API conventions
   - existing audit logging
   - existing migration mechanism
3. Reuse existing architecture, components, utilities, naming conventions and design system wherever practical.
4. Do **not** create duplicate masters when equivalent entities already exist.
5. Do **not** hard-code people such as HN, QK, JK or MK. Use configurable users, roles and teams.
6. Preserve backward compatibility with existing ERP/CRM functionality.
7. All database changes must use migrations.
8. All migrations should be reversible where practical.
9. Create a short implementation plan before coding Phase 1.
10. Build incrementally. Do not attempt the entire specification in one unreviewed code change.

---

# 2. Product Vision

SAK ONE should make SAK Solutions operate like a structured ERP implementation company rather than a founder-dependent collection of spreadsheets, WhatsApp messages and individual memory.

The system must give management one place to answer:

- Who is the customer?
- What did we sell?
- What did we promise?
- What is in scope?
- Who owns the project?
- What is pending from SAK?
- What is pending from the customer?
- What customization is being developed?
- What is under QA?
- What is awaiting UAT?
- What has gone live?
- What support issues are open?
- What invoices are pending?
- What is overdue?
- What is the renewal date?
- What is the next sales / customer-success opportunity?
- Is this customer profitable?
- Is this project healthy?
- What requires management intervention today?

---

# 3. Core Design Principles

## 3.1 One customer, one record

Every customer must have one canonical customer/account record.

All records must relate back to the same customer identity:

- contacts
- opportunities
- enquiries
- requirements
- proposals
- quotations
- contracts
- projects
- tasks
- development requests
- change requests
- support tickets
- invoices
- receipts
- collections
- renewals
- customer-success records
- documents
- activity history

Avoid duplicate customer masters across CRM, project management, support and finance.

---

## 3.2 One source of truth

No critical operational information should require a parallel Excel sheet, WhatsApp list or private notebook.

The system should become the authoritative operational record.

---

## 3.3 Traceability

A user should be able to trace the full chain:

**Lead**
→ **Opportunity**
→ **Requirement**
→ **Proposal**
→ **Order / Contract**
→ **Project**
→ **Project Requirement**
→ **Development Request / Change Request**
→ **QA**
→ **UAT**
→ **Release / Go-Live**
→ **Support**
→ **Invoice / Collection**
→ **Renewal**

Where applicable, records must store parent/child relationships.

---

## 3.4 Auditability

Important changes must be auditable.

At minimum record:

- created by
- created at
- updated by
- updated at
- status changes
- approval decisions
- commercial changes
- scope changes
- assignment changes
- customer sign-off
- attachment/document versions

For high-risk records, keep immutable history rather than overwriting the prior value.

---

## 3.5 Configuration over hard-coding

Use configuration tables / admin settings for:

- stages
- priorities
- SLA targets
- approval thresholds
- document types
- project phases
- task categories
- ticket categories
- support plans
- notification rules
- currencies
- tax settings where applicable
- role permissions

---

# 4. Initial Scope

SAK ONE will be developed in phases.

## Phase 1 — Foundation / Minimum Viable Operating System

Build first:

1. Customer 360
2. CRM pipeline enhancement
3. Requirement / enquiry management
4. Proposal / quotation linkage
5. Order-to-project conversion
6. Project management
7. Project tasks
8. Change requests
9. UAE → Pune development workflow
10. Support / ticketing
11. Document attachment and version linkage
12. Basic approvals
13. Notifications / escalations
14. Management dashboard
15. Sales dashboard
16. Project dashboard
17. Support dashboard

## Phase 2 — Commercial control and customer success

Build after Phase 1 is stable:

1. Finance integration
2. Payment milestone tracking
3. Customer profitability
4. Customer success
5. Renewals / AMC
6. Customer health
7. Product / feature management
8. Advanced approval engine
9. Document generation from templates
10. Advanced dashboards and reports

## Phase 3 — Optimization

Later:

1. Advanced workflow automation
2. AI assistance
3. forecasting
4. capacity planning
5. product analytics
6. executive BI
7. customer portal
8. vendor / subcontractor portal if required
9. advanced SLA analytics
10. predictive risk indicators

---

# 5. Suggested Domain Model

**Important:** Adapt names to existing entities. Do not duplicate equivalent tables.

Core entities:

```text
Customer / Account
Contact
User
Employee
Team
Role

Lead
Opportunity
OpportunityActivity
Enquiry
Requirement
Proposal
Quotation
Contract
SalesOrder

Project
ProjectPhase
ProjectTask
ProjectTeamMember
ProjectRisk
ProjectIssue
ProjectMilestone

ChangeRequest
DevelopmentRequest
Bug
FeatureRequest
QARecord
UATRecord
Release
Deployment

SupportTicket
TicketActivity
SLAPolicy

Invoice
Receipt
PaymentMilestone
CustomerBalance

CustomerSuccessReview
CustomerHealth
Renewal
UpsellOpportunity

Product
ProductModule
ProductFeature
ProductVersion
ReleaseNote

Document
DocumentVersion
Attachment

ApprovalRequest
ApprovalStep

Notification
EscalationRule
AuditEvent
Comment
ActivityLog
```

---

# 6. Customer Master / Customer 360

## 6.1 Customer master fields

Reuse the existing customer/account master and extend it where necessary.

### Identity

- customer_id
- legal_name
- trade_name
- account_status
- customer_type
- industry
- website
- country
- emirate/state
- city
- address
- tax_registration_number
- registration_number
- parent_company_id if applicable

### Business profile

- employee_count
- number_of_sites
- estimated_user_count
- business_segment
- account_tier
- customer_since
- lead_source

### Ownership

- account_owner_user_id
- customer_success_owner_user_id
- support_owner_user_id
- default_project_manager_user_id

### Commercial

- currency
- payment_terms
- credit_days
- credit_limit
- annual_contract_value
- recurring_revenue
- support_plan
- renewal_date

### Status

- prospect
- active_customer
- implementation
- live
- inactive
- suspended
- lost

---

## 6.2 Contact management

Each customer can have multiple contacts.

Contact categories:

- management sponsor
- decision maker
- project manager
- finance
- IT
- operations
- HR
- procurement
- end user
- other

Fields:

- name
- designation
- department
- email
- phone
- WhatsApp if used
- preferred communication channel
- primary contact flag
- active flag

---

## 6.3 Customer 360 page

The Customer 360 page should be one of the most important screens in SAK ONE.

Suggested tabs:

1. Overview
2. Contacts
3. Sales
4. Proposals / Contracts
5. Projects
6. Requirements
7. Development
8. Support
9. Finance
10. Customer Success
11. Renewals
12. Documents
13. Activity Timeline

### Customer 360 summary cards

Display:

- customer status
- account owner
- active products
- active projects
- project health
- contract value
- recurring revenue
- outstanding receivables
- open support tickets
- critical tickets
- next renewal
- next customer action
- last interaction
- customer health

---

# 7. CRM / Sales Pipeline

Enhance the existing CRM instead of creating a parallel CRM.

## 7.1 Standard opportunity stages

Configurable default stages:

1. Lead
2. Qualified
3. Discovery
4. Demo
5. Requirement
6. Solution
7. Proposal
8. Negotiation
9. PO / Contract
10. Won
11. Lost
12. On Hold

---

## 7.2 Opportunity fields

- opportunity_id
- customer_id / prospect_id
- opportunity_name
- product
- modules
- sales_owner
- lead_source
- estimated_value
- estimated_recurring_value
- currency
- probability
- expected_close_date
- decision_maker_contact_id
- competitor
- business_problem
- next_action
- next_action_date
- last_activity_date
- proposal_value
- discount_percent
- loss_reason
- loss_notes
- stage
- stage_changed_at

---

## 7.3 Mandatory sales rules

1. An open opportunity must have an owner.
2. An open opportunity must have a next action.
3. An open opportunity must have a next-action date.
4. Lost opportunities require a loss reason.
5. Won opportunities must link to a commercial record such as quotation, proposal, contract or order.
6. Stage changes must be logged.
7. Opportunity ageing must be visible.
8. Proposal ageing must be visible.
9. Management should be able to view opportunities with no activity for configurable number of days.

---

## 7.4 Sales activity timeline

Activities include:

- call
- email
- meeting
- demo
- follow-up
- proposal sent
- quotation sent
- negotiation
- site visit
- note
- document shared

Store:

- date/time
- user
- activity type
- notes
- next action
- next action date
- linked opportunity
- linked customer/contact

---

# 8. Enquiry / Requirement Management

## 8.1 Purpose

Convert customer requests into structured records before they become scope or development commitments.

## 8.2 Enquiry fields

- enquiry_id
- customer_id
- opportunity_id
- source
- requested_by_contact
- requested_date
- summary
- description
- department
- business_problem
- priority
- target_date
- status

## 8.3 Requirement classification

Every requirement should be classified as one of:

- standard feature
- configuration
- customization
- integration
- new product feature
- bug
- report
- data migration
- training
- process change
- other

## 8.4 Requirement fields

- requirement_id
- enquiry_id
- customer_id
- project_id optional
- title
- business_requirement
- current_process
- expected_process
- acceptance_criteria
- module
- classification
- priority
- customer_priority
- internal_priority
- complexity
- estimated_effort
- commercial_impact
- schedule_impact
- status
- owner
- approver
- source_document
- signoff_status

## 8.5 Requirement states

Suggested:

```text
Draft
Under Review
Clarification Required
Approved
Rejected
In Scope
Out of Scope
Converted to Change Request
Converted to Development Request
Completed
Cancelled
```

---

# 9. Proposal / Quotation Integration

## 9.1 Objective

Proposal and quotation data should come from structured CRM and product data wherever possible.

## 9.2 Proposal components

A proposal should be able to link to:

- customer
- opportunity
- requirements
- product
- modules
- implementation services
- customizations
- integrations
- training
- support / AMC
- third-party charges
- assumptions
- exclusions
- payment milestones
- validity
- implementation timeline

## 9.3 Commercial line types

Suggested:

- license
- subscription
- implementation
- customization
- integration
- training
- support
- AMC
- cloud / hosting
- travel
- third-party
- hardware
- other

## 9.4 Discount controls

Support configurable discount approval thresholds.

Example only:

```text
0–5%   -> designated commercial role
5–10%  -> senior approval
>10%   -> management approval
```

Do not hard-code these percentages. Store in configuration.

---

# 10. Order / Contract to Project Conversion

When an opportunity becomes Won:

The system should support a controlled conversion.

## 10.1 Conversion action

`Create Project from Won Opportunity`

Should carry forward:

- customer
- opportunity
- product
- modules
- approved requirements
- commercial reference
- contract / PO reference
- project value
- recurring value
- payment milestones
- planned start date
- target go-live
- agreed scope
- assigned project manager
- relevant documents

Do not re-key information unnecessarily.

---

# 11. Project / ERP Implementation Management

## 11.1 Project master

Fields:

- project_id
- project_name
- customer_id
- opportunity_id
- contract_id / sales_order_id
- project_manager_user_id
- functional_lead_user_id
- technical_lead_user_id
- support_lead_user_id
- customer_project_manager_contact_id
- customer_sponsor_contact_id
- start_date
- planned_go_live_date
- actual_go_live_date
- status
- health
- project_value
- recurring_value
- progress_percent
- current_phase
- scope_summary
- risks_summary
- management_attention_required

## 11.2 Project health

Use configurable status:

- Green
- Amber
- Red

Health can be manually set initially.

Later it may be system-calculated using:

- milestone delay
- overdue customer actions
- overdue internal tasks
- open P1/P2 issues
- budget overrun
- unpaid milestones
- unresolved change requests

---

## 11.3 Standard project phases

Default template:

1. Kickoff
2. Discovery
3. Requirement Confirmation
4. Configuration
5. Development
6. Data Migration
7. Internal Testing
8. Training
9. UAT
10. Go-Live
11. Stabilization
12. Support Handover
13. Closed

Phases must be configurable per project type.

Each phase stores:

- planned start
- planned end
- actual start
- actual end
- status
- owner
- completion %
- exit criteria
- sign-off required flag
- sign-off status

---

# 12. Project Team / RACI

Project roles should support:

- Account Manager
- Project Manager
- Functional Consultant
- Technical Lead
- Developer
- QA
- Support
- Finance
- Management Sponsor

Customer-side roles:

- Executive Sponsor
- Customer Project Manager
- IT
- Finance
- Operations
- Department Key User

Do not embed employee names in role definitions.

---

# 13. Project Tasks

Fields:

- task_id
- project_id
- phase_id
- parent_task_id
- title
- description
- task_type
- owner_user_id
- assigned_team_id
- priority
- start_date
- due_date
- completed_date
- status
- completion_percent
- dependency_task_id
- customer_dependency flag
- blocker_reason
- notes

Statuses:

- Not Started
- In Progress
- Blocked
- Waiting for Customer
- Waiting for Internal
- Completed
- Cancelled

---

# 14. Risks and Issues

## 14.1 Risk register

Fields:

- risk_id
- project_id
- description
- probability
- impact
- severity
- mitigation
- owner
- target_date
- status

## 14.2 Issue register

Fields:

- issue_id
- project_id
- description
- severity
- owner
- opened_date
- target_date
- resolution
- closed_date
- status

---

# 15. Change Request Management

This is mandatory for ERP implementation profitability.

## 15.1 Change Request fields

- cr_id
- customer_id
- project_id
- related_requirement_id
- requested_by
- requested_date
- title
- description
- original_scope_reference
- reason
- functional_impact
- technical_impact
- estimated_effort
- cost_impact
- schedule_impact
- proposed_price
- currency
- approval_status
- customer_approval_status
- development_required
- target_release
- status

## 15.2 Workflow

```text
Draft
→ Internal Review
→ Functional Review
→ Technical Estimation
→ Commercial Review
→ Customer Approval
→ Approved
→ Development / Configuration
→ QA
→ UAT
→ Released
→ Closed
```

Alternative end states:

- Rejected
- Deferred
- Cancelled

## 15.3 Rule

No out-of-scope development should start without an approved CR or explicit authorized exception captured in the system.

---

# 16. UAE → Pune Development Workflow

## 16.1 Objective

No customer should directly drive developer priorities.

All development requests must enter through a controlled workflow.

## 16.2 Development request fields

- development_request_id
- customer_id
- project_id
- requirement_id
- change_request_id optional
- request_type
- title
- description
- acceptance_criteria
- module
- requested_by_user
- functional_owner
- technical_owner
- assigned_developer
- priority
- customer_priority
- product_priority
- estimated_hours
- approved_hours
- target_version
- target_date
- status
- branch/reference optional
- qa_status
- uat_status
- release_id

## 16.3 Request types

- customization
- bug
- product feature
- integration
- report
- migration script
- technical task

## 16.4 Development states

```text
Draft
Functional Review
Technical Review
Estimate Required
Awaiting Approval
Approved
Planned
In Development
Code Review
Ready for QA
QA Failed
QA Passed
Ready for UAT
UAT Failed
UAT Passed
Ready for Release
Released
Closed
Deferred
Rejected
```

---

# 17. QA Management

Minimum QA record:

- qa_id
- development_request_id
- build/version
- tester
- test_date
- environment
- test_result
- failed_cases
- evidence
- notes
- retest_required
- signoff

The system should allow attaching:

- screenshots
- test evidence
- logs
- test case documents

---

# 18. UAT Management

Fields:

- uat_id
- project_id
- requirement_id / development_request_id
- customer_contact_id
- build/version
- uat_start
- uat_due
- status
- customer_comments
- accepted_at
- accepted_by
- signoff_document

Statuses:

- Not Started
- In Progress
- Failed
- Passed
- Passed with Conditions
- Rework Required

---

# 19. Release / Deployment Management

Release fields:

- release_id
- product_id
- version
- environment
- planned_date
- actual_date
- release_owner
- approved_by
- deployment_status
- rollback_plan
- deployment_notes

Link release to:

- development requests
- bugs
- features
- projects
- customers if customer-specific
- release notes

---

# 20. Support / Ticketing

## 20.1 Ticket fields

- ticket_id
- customer_id
- project_id optional
- product_id
- module
- contact_id
- subject
- description
- source
- priority
- severity
- assigned_team
- assigned_user
- support_plan
- sla_policy_id
- opened_at
- first_response_at
- resolved_at
- closed_at
- status
- root_cause
- resolution
- customer_confirmation
- related_bug_id optional
- related_development_request_id optional

## 20.2 Ticket sources

- portal
- email
- phone
- WhatsApp manually logged
- internal
- monitoring / automated
- other

## 20.3 Priority example

Configurable:

- P1 — system unavailable / business-critical outage
- P2 — major functionality affected
- P3 — normal issue
- P4 — request / question

## 20.4 SLA calculations

Track:

- response target
- response elapsed
- resolution target
- resolution elapsed
- within SLA
- near breach
- breached

Do not define legal/commercial SLA values in code. Use support-plan configuration.

---

# 21. Customer Success

Phase 2 feature.

Customer Success should answer:

> Is the customer receiving value, likely to renew, likely to expand, or at risk?

## 21.1 Customer Success Review

Fields:

- review_id
- customer_id
- owner
- review_date
- usage_summary
- open_issues
- adoption_notes
- payment_status
- customer_feedback
- renewal_risk
- upsell_opportunity
- actions
- next_review_date

## 21.2 Customer Health

Initial manual score:

- Green
- Amber
- Red

Store reasons.

Later health may be calculated from:

- ticket severity
- ticket volume
- overdue receivables
- project delay
- usage/adoption if measurable
- unresolved issues
- renewal proximity
- customer feedback

---

# 22. Renewal / AMC Management

Fields:

- renewal_id
- customer_id
- contract_id
- product
- support_plan
- current_value
- renewal_date
- notice_date
- renewal_owner
- proposed_value
- status
- probability
- next_action
- next_action_date
- renewal_outcome

Statuses:

- Upcoming
- Contacted
- Proposal Sent
- Negotiation
- Renewed
- Lost
- Cancelled

Create reminders at configurable intervals, e.g.:

- 90 days
- 60 days
- 30 days
- 15 days

---

# 23. Finance Integration

Do not rebuild finance if existing ERP finance already supports it.

Integrate operational records with existing finance.

Required links:

Customer
→ Contract / Sales Order
→ Payment Milestone
→ Invoice
→ Receipt
→ Outstanding

## 23.1 Payment Milestone

Fields:

- milestone_id
- project_id
- contract_id
- description
- percentage
- amount
- due_event
- due_date
- invoice_id
- invoice_status
- payment_status

## 23.2 Customer financial summary

Customer 360 should show:

- total invoiced
- total received
- current outstanding
- overdue amount
- oldest overdue
- next payment milestone
- contract value
- recurring revenue

Permissions must restrict sensitive finance information.

---

# 24. Customer / Project Profitability

Phase 2.

Track direct delivery costs where data exists:

- implementation effort
- development effort
- travel
- subcontractors
- third-party charges
- support effort
- cloud / infrastructure where applicable

Provide:

```text
Revenue
- Direct Delivery Cost
= Gross Profit

Gross Profit / Revenue
= Gross Margin %
```

Do not fabricate costs. Use actual finance/time data where available.

---

# 25. Product Management

Phase 2.

Entities:

## Product
Example:
- Mizantra ERP
- Mizantra EMS
- Mizantra FSM

## Product Module
Example:
- Finance
- Sales
- Purchase
- Inventory
- Production
- Maintenance

## Product Feature

Fields:

- feature_id
- product_id
- module_id
- feature_name
- description
- standard/custom
- status
- introduced_version
- deprecated_version
- documentation_link

## Product Version

- version_id
- product_id
- version
- release_date
- status
- release_notes

---

# 26. Document Management

Documents must be linked to business records.

## 26.1 Document entity

Fields:

- document_id
- document_type
- document_number
- customer_id optional
- opportunity_id optional
- project_id optional
- requirement_id optional
- cr_id optional
- ticket_id optional
- contract_id optional
- title
- current_version
- status
- owner
- approved_by
- approved_at
- file_location
- confidentiality_level

## 26.2 Document versions

Store:

- version number
- uploaded/generated by
- date/time
- change note
- file reference
- approval state

Do not overwrite prior approved versions.

---

# 27. Document Generation Engine

Phase 2, but architecture should allow it from the start.

System-generated documents may include:

- proposal
- quotation
- project charter
- implementation plan
- requirement document
- change request
- weekly project report
- UAT sign-off
- go-live sign-off
- support report
- renewal letter

Principle:

**SYSTEM DATA → TEMPLATE → GENERATED DOCUMENT → APPROVAL → CUSTOMER / PROJECT RECORD**

Template engine should support:

- branding
- variable placeholders
- tables
- customer data
- commercial data
- project data
- approval blocks
- version number
- generated date
- generated by

Generated files should be stored as document versions.

---

# 28. Approval Engine

Create reusable approval architecture.

## 28.1 ApprovalRequest

Fields:

- approval_request_id
- entity_type
- entity_id
- approval_type
- requested_by
- requested_at
- current_step
- status
- completed_at

## 28.2 ApprovalStep

- step_number
- required_role
- assigned_user optional
- decision
- decision_by
- decision_at
- comments

Use for:

- discounts
- proposals
- change requests
- credit exceptions
- project closure
- releases
- expenses later
- purchases later

Approval policy must be configurable.

---

# 29. Notification and Escalation Engine

## 29.1 Notification types

- in-app
- email if supported
- future optional messaging integrations

## 29.2 Events

Examples:

### Sales
- next action due today
- next action overdue
- proposal idle for X days
- expected close date passed
- opportunity with no recent activity

### Project
- milestone overdue
- task overdue
- blocked task
- project turned Red
- customer dependency overdue
- sign-off pending

### Development
- estimate overdue
- QA failed
- UAT failed
- release awaiting approval

### Support
- P1 created
- SLA nearing breach
- SLA breached
- ticket ageing threshold

### Finance
- invoice overdue
- payment milestone due
- credit threshold exceeded

### Renewal
- renewal within configured days
- renewal action overdue

---

# 30. Role-Based Access Control

Use existing authentication and permission architecture.

Suggested roles:

- System Admin
- Management
- Sales
- Account Manager
- Project Manager
- Functional Consultant
- Technical Lead
- Developer
- QA
- Support
- Finance
- Customer Success
- Viewer / Auditor

Permissions should be action-based where possible:

- view
- create
- edit
- delete / archive
- assign
- approve
- close
- export
- view financial data
- view confidential documents

Avoid role assumptions in UI only. Enforce server-side authorization.

---

# 31. Activity Timeline

Create a reusable timeline component that can appear on:

- customer
- opportunity
- project
- ticket
- development request

Events may include:

- created
- status changed
- assigned
- comment added
- meeting logged
- document uploaded
- approval
- email activity if integration exists
- invoice posted
- payment received
- ticket opened/closed
- project milestone completed
- change request approved

---

# 32. Comments / Mentions

Support internal comments on operational records.

Useful features:

- @mention users
- timestamp
- attachments
- edit history if edits allowed
- internal-only flag
- notification to mentioned user

Do not expose internal comments to customers unless a future portal explicitly supports customer-visible comments.

---

# 33. Dashboards

All dashboard metrics must drill down to underlying records.

Avoid dashboard numbers that cannot be reconciled.

---

## 33.1 Management Dashboard

### Sales

- open pipeline value
- weighted pipeline
- opportunities by stage
- proposals outstanding
- expected orders
- win rate
- average deal value
- opportunities with overdue next actions

### Delivery

- active projects
- project health count
- delayed projects
- upcoming go-lives
- overdue milestones
- projects requiring management attention

### Customers

- active customers
- customers in implementation
- customers live
- open critical tickets
- renewals due
- customer health summary

### Finance

Where permissions allow:

- monthly revenue
- recurring revenue
- receivables
- overdue receivables
- collections
- gross margin if available

### Product / Development

- open development requests
- requests by status
- QA pending
- UAT pending
- overdue development
- planned releases

---

## 33.2 Sales Dashboard

- leads by source
- new leads
- qualified leads
- pipeline by stage
- pipeline by salesperson
- proposals sent
- proposal ageing
- conversion rate
- won value
- lost value
- lost reasons
- expected close this month
- sales activities overdue

---

## 33.3 Project Dashboard

- active projects
- projects by phase
- projects by project manager
- health: Green / Amber / Red
- planned vs actual go-live
- overdue tasks
- customer dependencies
- open risks
- open issues
- open change requests
- payment milestone status if permitted

---

## 33.4 Support Dashboard

- open tickets
- tickets by priority
- P1 / P2 open
- SLA near breach
- SLA breached
- tickets by customer
- tickets by module
- ticket ageing
- average first response
- average resolution time
- recurring issue categories

---

## 33.5 Customer 360 Dashboard

For one customer:

- contract value
- recurring revenue
- products/modules
- account owner
- current projects
- project progress
- open change requests
- open development
- open tickets
- financial outstanding
- next renewal
- customer health
- next action
- recent activity

---

# 34. Search

Implement global search if architecture permits.

Search by:

- customer name
- customer ID
- contact
- opportunity ID
- project ID
- ticket ID
- CR ID
- development request ID
- invoice number
- phone
- email
- document number

---

# 35. IDs / Numbering

Use readable business IDs in addition to internal primary keys.

Examples:

```text
CUS-000001
OPP-2026-0001
ENQ-2026-0001
REQ-2026-0001
PRJ-UAE-2026-0001
CR-2026-0001
DEV-2026-0001
TKT-2026-0001
REL-2026-0001
```

Number patterns should ideally be configurable.

Do not rely on business IDs as database primary keys unless existing architecture already does so.

---

# 36. Data Integrity Rules

Examples:

1. A project must have a customer.
2. A project must have an owner / project manager.
3. A Won opportunity cannot be edited back to early pipeline stages without authorized action.
4. Closed support tickets require a resolution.
5. Lost opportunities require a reason.
6. Approved CR commercial values must preserve history.
7. Released development items must point to a release/version where applicable.
8. UAT acceptance should preserve accepted-by and accepted-at.
9. Closed projects should require project closure authorization.
10. Hard deletes should be avoided for commercial / project / support history.

---

# 37. Non-Functional Requirements

## 37.1 Security

- follow existing secure coding practices
- server-side authorization
- MFA support if existing auth allows
- secure password/session handling
- protect file access
- do not expose confidential documents by predictable URLs
- validate all input
- parameterized queries / ORM safe methods
- protection from common OWASP risks
- rate limit sensitive endpoints if needed
- audit privileged actions

## 37.2 Performance

Initial target:

- common list views should load quickly under normal business volumes
- dashboards should use optimized aggregated queries
- add indexes for common filtering keys
- paginate large tables
- do not load full audit histories by default
- async/background processing may be used for heavy document generation or notifications if current architecture supports it

## 37.3 Reliability

- graceful error handling
- transaction boundaries for multi-step operations
- idempotency for sensitive conversion actions where practical
- no duplicate project creation from one order
- no duplicate invoice linkage
- safe retry for notification jobs

## 37.4 Observability

Use current logging framework.

Log:

- application errors
- failed integrations
- workflow failures
- approval failures
- notification failures
- document-generation failures

---

# 38. UI / UX Requirements

The UI should feel like one product, not separate modules.

Use existing design system.

Common requirements:

- consistent page headers
- status chips
- owner/assignee avatars where supported
- clear primary action
- filters
- saved views where practical
- bulk actions only where safe
- responsive layout if existing product is responsive
- empty states
- validation messages
- breadcrumbs
- record IDs visible
- audit/history tab
- attachments tab
- comments/activity tab

Avoid excessively complex screens.

---

# 39. List View Standards

All major modules should support:

- search
- filters
- sorting
- pagination
- column selection if existing UI supports
- export subject to permissions
- saved filters in later phase

Common filters:

- status
- owner
- customer
- date range
- priority
- project
- product/module

---

# 40. Reporting

Phase 1 reports:

1. Open opportunity report
2. Opportunity ageing
3. Proposal ageing
4. Won/lost report
5. Active projects
6. Project health
7. Overdue project tasks
8. Open CRs
9. Development backlog
10. QA/UAT pending
11. Open support tickets
12. SLA breach report
13. Renewal due report if Phase 2 enabled
14. Customer outstanding if finance integration enabled

Exports should respect permission rules.

---

# 41. Audit Log

Audit these events at minimum:

- login/security relevant actions if existing framework does
- customer ownership changes
- opportunity stage/value changes
- discount changes
- approval decisions
- project status/health changes
- CR scope/price changes
- development status changes
- release approvals
- ticket priority changes
- SLA overrides
- invoice/customer commercial changes where integrated
- document approval changes

Audit data should include:

- entity
- entity ID
- action
- old value where practical
- new value
- user
- timestamp
- source/IP if existing audit framework supports

---

# 42. API Principles

Use existing API style.

Prefer resource-oriented endpoints or existing conventions.

Illustrative only:

```text
GET    /customers
GET    /customers/{id}
GET    /customers/{id}/360

GET    /opportunities
POST   /opportunities
PATCH  /opportunities/{id}

POST   /opportunities/{id}/convert-to-project

GET    /projects
POST   /projects
GET    /projects/{id}
PATCH  /projects/{id}

POST   /projects/{id}/tasks
POST   /projects/{id}/change-requests

GET    /development-requests
POST   /development-requests
PATCH  /development-requests/{id}

GET    /tickets
POST   /tickets
PATCH  /tickets/{id}

POST   /approvals
POST   /approvals/{id}/approve
POST   /approvals/{id}/reject
```

Do not create APIs that violate current backend conventions.

---

# 43. Database / Migration Guidance

Before adding tables:

1. map existing tables
2. reuse existing foreign keys
3. identify duplicate entity risk
4. confirm tenant/company boundaries if multi-company
5. apply existing soft-delete convention
6. apply existing timestamp convention
7. apply existing UUID/integer key strategy
8. add indexes

Common index candidates:

- customer_id
- project_id
- opportunity_id
- status
- owner_user_id
- assigned_user_id
- due_date
- renewal_date
- created_at
- ticket priority
- stage
- business ID

---

# 44. Multi-Company / Multi-Tenant Considerations

If the current ERP supports multiple legal entities or tenants:

All new records must respect existing tenant/company isolation.

Do not assume SAK UAE is the only organization.

Where necessary include:

- company_id
- branch_id
- location_id

Authorization must prevent cross-company data exposure.

---

# 45. File Storage

Use existing file storage abstraction.

Do not store large binary files directly in the database unless the current system already does this intentionally.

Store:

- logical document record in database
- physical file reference/path/object key
- mime type
- size
- checksum if existing architecture supports
- original filename
- uploaded by
- uploaded at

---

# 46. Import / Migration

The implementation should allow migration of current data from spreadsheets where necessary.

Potential imports:

- customers
- contacts
- leads
- opportunities
- active projects
- open support tickets
- renewals

Create import validation and error reporting.

Do not silently import malformed data.

---

# 47. Testing Requirements

## Unit tests

For:

- status transitions
- SLA calculations
- approval rules
- conversion logic
- numbering
- permissions
- dashboard aggregations

## Integration tests

For:

- opportunity → project
- requirement → CR / development
- development → QA → UAT → release
- ticket SLA
- project financial linkage
- document linkage
- approval workflow

## Permission tests

Test each role against:

- view
- create
- edit
- approve
- financial access
- confidential documents

## Regression tests

Existing ERP/CRM flows must continue to work.

---

# 48. Seed / Demo Data

For development and demos, create non-sensitive demo data.

Example customer:

```text
ABC Manufacturing LLC
```

Include:

- 3 contacts
- 2 opportunities
- 1 Won opportunity
- 1 active ERP implementation project
- project phases
- 8 project tasks
- 2 requirements
- 1 change request
- 2 development requests
- 1 UAT record
- 3 support tickets
- 1 upcoming payment milestone
```

This allows dashboard and Customer 360 development without real customer data.

---

# 49. Phase 1 Detailed Build Order

## Sprint / Milestone 0 — Codebase Discovery

Deliver:

- architecture summary
- entity map
- existing reusable modules
- proposed schema changes
- proposed routes/pages
- risks
- implementation sequence

Do not begin broad refactoring before this is complete.

---

## Sprint / Milestone 1 — Customer 360 Foundation

Build:

- customer extensions
- contacts
- customer 360 page
- activity timeline
- documents/attachments relationship
- customer ownership

Acceptance criteria:

- existing customer opens in Customer 360
- user can see core account data
- contacts visible
- related opportunities visible
- related projects visible
- related tickets visible when modules exist
- documents linked
- recent activity visible

---

## Sprint / Milestone 2 — CRM Discipline

Build:

- pipeline stages
- opportunity required fields
- next action
- next action date
- ageing
- lost reason
- stage history
- sales dashboard

Acceptance criteria:

- open opportunity cannot be saved without owner
- next-action validation works based on defined rules
- lost opportunity requires lost reason
- dashboard drills into opportunity lists
- stage change is audited

---

## Sprint / Milestone 3 — Requirements

Build:

- enquiry
- requirement
- classification
- acceptance criteria
- requirement status
- requirement links to opportunity/customer/project

Acceptance criteria:

- requirement can originate before project
- requirement can be transferred into project
- requirement can convert to CR or Development Request
- conversion preserves traceability

---

## Sprint / Milestone 4 — Project Management

Build:

- project
- phases
- milestones
- project team
- tasks
- risks
- issues
- project dashboard

Acceptance criteria:

- Won opportunity can create project
- no duplicate conversion
- standard project template can generate default phases
- progress visible
- project health visible
- project owner visible
- overdue tasks visible

---

## Sprint / Milestone 5 — Change Requests

Build:

- CR master
- impact assessment
- estimation
- approval status
- customer approval
- CR dashboard/list
- conversion to development request

Acceptance criteria:

- CR retains original scope reference
- approved cost and schedule impact cannot be silently overwritten
- approval history preserved
- development can link back to CR

---

## Sprint / Milestone 6 — UAE → Pune Development

Build:

- development request
- functional review
- technical review
- estimate
- status workflow
- developer assignment
- QA state
- UAT state
- release linkage

Acceptance criteria:

- development item always identifies customer/project where customer-specific
- acceptance criteria required before development begins, unless authorized exception
- QA and UAT history preserved
- released item identifies release/version

---

## Sprint / Milestone 7 — Support

Build:

- tickets
- priority
- assignment
- SLA
- ticket timeline
- ticket dashboard
- escalation

Acceptance criteria:

- P1/P2 clearly visible
- SLA timers work
- near-breach and breach visible
- closure requires resolution
- ticket can link to bug/development request
- customer 360 displays tickets

---

## Sprint / Milestone 8 — Management Dashboard

Build consolidated dashboard using already completed modules.

Acceptance criteria:

- no hard-coded statistics
- all metrics come from live data
- every important card can drill down
- permission-based financial visibility
- filters by date/team/company where relevant

---

# 50. Phase 2 Build Order

1. Finance integration
2. Payment milestones
3. Customer success
4. Renewals
5. Customer health
6. Product management
7. Document generation
8. Advanced approval engine
9. Customer profitability
10. Advanced management analytics

---

# 51. Out of Scope for Initial Phase

Do not delay Phase 1 to build:

- AI assistant
- predictive forecasting
- advanced BI warehouse
- customer mobile app
- full HRMS
- payroll
- advanced capacity planning
- advanced product analytics
- external customer portal
- marketing automation suite
- sophisticated low-code workflow builder

These can be added after the core operating system is reliable.

---

# 52. Definition of Done for Any Feature

A feature is not complete until:

- database migration exists
- backend/business logic exists
- authorization exists
- UI exists
- validation exists
- audit logging exists where applicable
- tests exist
- errors handled
- empty state handled
- loading state handled
- permissions tested
- documentation/comments updated
- no known regression in existing ERP/CRM
- acceptance criteria demonstrated

---

# 53. Development Rules

1. Keep code modular.
2. Reuse existing design and utilities.
3. Avoid premature microservices.
4. Avoid new infrastructure unless justified.
5. Use existing database unless a strong technical reason requires otherwise.
6. Do not introduce duplicate CRM/customer masters.
7. Do not build a second authentication system.
8. Do not hard-code current employees.
9. Do not hard-code approval users.
10. Do not hard-code SLA values.
11. Do not hard-code project phases without allowing templates/configuration.
12. Preserve historical values for commercial and approved records.
13. Prefer archive/close over destructive deletion.
14. Add tests for workflow transitions.
15. Every dashboard number must be traceable to records.

---

# 54. Recommended Developer Workflow

For each milestone:

1. inspect relevant existing module
2. propose schema changes
3. propose backend/API changes
4. propose UI routes/components
5. implement migration
6. implement backend
7. implement permissions
8. implement UI
9. implement tests
10. seed demo data
11. demonstrate acceptance criteria
12. commit in logically separated changes

---

# 55. First Prompt to the Coding Agent

Use this instruction after placing this document in the repository:

> Read `SAK_ONE_DEVELOPMENT_SPEC.md` completely.  
> Do not start by generating the whole application.  
> First inspect the existing ERP/CRM repository and identify the current technology stack, database models, customer/account master, CRM opportunity model, authentication, authorization, document storage, finance integration, routing and UI conventions.  
> Then produce a **Phase 0 implementation assessment** containing:
> 1. current architecture summary,
> 2. reusable existing modules,
> 3. gaps against this specification,
> 4. proposed database/entity changes,
> 5. proposed routes/screens,
> 6. proposed API/service changes,
> 7. permissions model,
> 8. migration risks,
> 9. recommended Phase 1 development sequence.
>
> Do not duplicate functionality that already exists.  
> Do not refactor unrelated modules.  
> After the assessment, begin with **Milestone 1 — Customer 360 Foundation** unless the current architecture reveals a dependency that must be completed first.

---

# 56. Business Success Criteria

SAK ONE is successful when management can run the business from the system rather than from memory.

A management user should be able to answer, without asking multiple people:

- What is our current sales pipeline?
- Which opportunities need follow-up?
- Which proposals are ageing?
- Which projects are delayed?
- Which projects are Red?
- What is pending from the customer?
- What is pending from SAK?
- What customization is under development?
- What is awaiting QA?
- What is awaiting UAT?
- What support tickets are critical?
- Which SLA is about to breach?
- Which invoices are overdue?
- Which customers renew soon?
- Which customer requires management attention?
- Who owns every important next action?

When these questions can be answered reliably from SAK ONE, the system is doing its job.

---

# 57. Final Architectural Principle

The application must reflect the full operating chain:

```text
MARKET
  ↓
LEAD
  ↓
OPPORTUNITY
  ↓
DISCOVERY
  ↓
REQUIREMENT
  ↓
PROPOSAL
  ↓
ORDER / CONTRACT
  ↓
PROJECT
  ↓
IMPLEMENTATION
  ↓
CHANGE / DEVELOPMENT
  ↓
QA
  ↓
UAT
  ↓
GO-LIVE
  ↓
SUPPORT
  ↓
CUSTOMER SUCCESS
  ↓
RENEWAL / UPSELL
```

And all of it must connect to:

```text
CUSTOMER 360
      +
FINANCE
      +
DOCUMENTS
      +
AUDIT HISTORY
      +
MANAGEMENT DASHBOARDS
```

**One customer. One system. One process. One source of truth.**

