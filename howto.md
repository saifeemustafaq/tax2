

Intuit Development Portal
Create
Manage
Monitor
Discover
GenAI powered search: ask a question
/

Intuit Assist



0
Autura

L0
AI Fabric

L1
GenAI Application Development
Use GenOS Express Mode APIs V3

GenAI Application Development
GenAI Application Development

Important:Maturity: 
Important:Adhoc Reuse
mkurian
Merrin Kurian
Capability Architect

Search within GenAI Application Development
Overview

Agentic AI
MCP (Model Context Protocol)
A2A (Agent2Agent Protocol)
MultiModal Access
AI Workbench
Getting Started
How To Guides

Reference

Technical References
DiY AI Playbook
How to Contribute to GenOS
Community Managed Projects
Support

API Reference
Technology Maturity
Hide sidebar
I can summarize this page for you

Summarize
Edit
Share
Table of Contents
Introduction
Overview
What is supported in Express V3 ?
Express V3 API Features
How is it different from GenOS Express Mode V2
Using Express V3 APIs
Prerequisites
Service SLAs
Throttling Rules
LLM Execution Service Base URLs
API Endpoints
Express V3 Streaming
API Spec
Response Status Codes
Headers
API Limits
Python based examples on how to use any SDK/Library to integrate with GenOS Express V3 APIs
JAVA based examples on how to use any SDK/Library to integrate with GenOS Express V3 APIs
Examples on how to access through REST APIs
Example Response Body
Support
FAQs
Troubleshooting
Pricing & SLA Reference
Is this page helpful?

How To Guides
Use GenOS Express Mode APIs V3
Last updated by Kuldeep Jain, on 2/13/2026
Introduction
This document will guide you on what Express V3 mode is and how to use Express Mode V3 APIs to interact with LLMs at Intuit

Overview
express_v3.png Express V3 APIs are your gateway to access any LLM available at Intuit via a unified set of APIs that adhere to OpenAI APIs contract.
These are built with philosophy that any OpenAI API compliant GenAI SDK out there, OpenSource or proprietary, can be used to talk to Express V3 APIs without writing any additional transformation or wrapper code. So, as long as the SDK of you are using can talk to OpenAI models, you can use it to talk to Express V3 APIs for any models available at Intuit.

LLMs available at Intuit that can be found here.

Important:What is supported in Express V3 ?
Below is the current state of what is available and what is not available across Express V3 APIs:

Feature	Description	Non-PCI Swimlane	PCI Swimlane	Tentative availability date
Sync APIs with PA+ support (Refer spec here)	APIs with PrivateAuthPlus support	Supported	Supported	Already available
Async APIs	Async APIs to handle reqeusts that
can take longer than 60 secs to respond	Not Supported	Not Supported	Will not be supported as Long Timeout Swinlane is available
PreAuth APIs	APIs that let you build PreAuth Experiences	Supported	Supported	Already available
Streaming APIs	APIs to access LLM with streaming outputs	Supported	Supported	Already available
Prompt logging	Persists the LLM inputs and output to Data Lake
that can be accessed later	- Supported
- Streaming APIs don't support Prompt Logging	- Supported
- Streaming APIs don't support Prompt Logging	- Already available for non-streaming
- For Streaming APIs, TBD
NOTE: PCI stands for Payment Card Industry.

Important:Express V3 API Features
Speed: Users can use any SDK, OpenSource or proprietary, of their choice (in any programming language) and as long as that SDK integrates with OpenAI it will integrate with Express V3 APIs seamlessly hence saving you from writing any transformation/wrappers.
Easy experimentation: Since Express V3 APIs are unified APIs, so users can switch between models, across diff vendors, without changing the code. Just change the model name and rest of the input format remains same.
No learning curve: The input and output of Express v3 APIs consistently adhere to OpenAI's API contract. So, no need to learn any opinionated input/output format.
APIs compliant to Intuit Paved Path: Express V3 APIs are backed by an MSaaS service and hence support Intuit standard authentication and access protocols
REST Access: Users are free to use any REST client to access V3.
Important:How is it different from GenOS Express Mode V2
OpenAI Contract: Express V3 APIs are compliant to OpenAI API contract. So, no need to learn any opinionated input/output format.
Lesser network hops: No longer need to onboard to GenOS Orchestrator (aka genplugins-svc aka https://genpluginregistry.api.intuit.com) that was acting as proxy in Express V2 mode to these APIs.
No catch-up: No longer need to await updates to GenOS client as you need not to use this sdk any longer.
Multilanguage support: With Express V2, you were bound to use genosclient sdk which was available in Python, JAVA and Javascript. With Express V3, you can use any SDK of your choice of any programming language
Using Express V3 APIs
Important:Prerequisites
Register Your Use Case and get an experience ID
Request onboarding to LLM Execution Service
Understanding service SLAs - Must read before you start using the APIs
Understanding Throttling rules - Must read before you start using the APIs
Important:Service SLAs
To understand service SLA, you need to understand how LLMs-as-a-service is offered by vendors to Intuit.

NOTE: These SLAs hold true for both Express V2 and Express V3 APIs.

Let's start with the types of model deployments. So, irrespective of vendor(GCP Vertex/Azure OpenAI/AWS Bedrock), there are 2 types of model deployements:

Pay-as-you-go aka On-demand model capacity: These are the model deployments where vendor shares the compute across all of its customers. So, if Intuit has created a model deployment of this type then Intuit will not be the only customer consuming that compute and hence this suffers from noisy-neighbor issues.
Provisioned model capacity: These are the model deployments that are bought and reserved by Intuit. These are only accessible by Intuit. There are no noisy-neighbor issues.
Now let's talk about the SLAs for these 2 types of model capacities:

For pay-as-you-go model capacity: There are no SLAs due to noisy-neighbor issues on vendor side. That means, neither latency nor availability can be guaranteed. This implies 2 things:
Latency variance: If a same request is sent to same model at 2 different times then the response time can vary.
No fixed capacity: We have published a number for model capacity, as nK tokens per minutes over here. This number is just a soft guarantee. This nK tokens per minute capacity is not available at all times for just Intuit. So, you might see 429s and 424s at any time. Here are some vendor docs where this expected behavior is documented:
See herefaq-latency_variance.png
See herefaq-latency_variance2.png
For provisioned model capacity: Both SLAs, latency and availability, are guaranteed.
This means SLAs are as under:

Important:For Pay-as-you-go
API Endpoint	Response Time	Availability
/chat/completions	None	None
/embeddings	None	None
Important:For Provisioned Capacity
API Endpoint	Response Time	Availability
/chat/completions	Guaranteed
Actual number will be determined
on per use case basis after doing load tests	Guaranteed
/embeddings	Guaranteed
Actual number will be determined
on per use case basis after doing load tests	Guaranteed
Important:Throttling Rules
Following are the default throttling rules that your use case will be subject:

Limits/Constraints: Defaults	Prod	E2E	PRF
App/Client level throttling	100 TPS	100 TPS	100 TPS
Experience Id level throttling	50 TPS	10 TPS	50 TPS
User level throttling	5 TPS	5 TPS	5 TPS
Please reach out to @llm-gateway-support in case you need a different throttling plan to discuss further.

Important:LLM Execution Service Base URLs
Base URLs for non-PCI:

QAL: https://llmexecution-qal.api.intuit.com/
E2E: https://llmexecution-e2e.api.intuit.com/
PRF: https://llmexecution-prf.api.intuit.com/
PRD: https://llmexecution.api.intuit.com/
Base URLs for PCI:

QAL: https://llmexecutionpci-qal.api.intuit.com/
E2E: https://llmexecutionpci-e2e.api.intuit.com/
PRF: https://llmexecutionpci-prf.api.intuit.com/
PRD: https://llmexecutionpci.api.intuit.com/
Important:API Endpoints
Swimlane Description	V3 API Endpoint
Non-Streaming Chat Completions with 60 seconds timeout	PrivateAuth+ => /v3/{intuit_genos_model_id}/chat/completions
PreAuth => /v3/pre_auth/{intuit_genos_model_id}/chat/completions
Embeddings with 60 seconds timeout	PrivateAuth+ => /v3/{intuit_genos_model_id}/embeddings
PreAuth => /v3/pre_auth/{intuit_genos_model_id}/embeddings
Streaming Chat Completions with 300 seconds timeout	PrivateAuth+ => /v3/stream/{intuit_genos_model_id}/chat/completions
PreAuth => Coming Soon
Long timeout Chat Completions with 300 seconds timeout	PrivateAuth+ => /v3/lt/{intuit_genos_model_id}/chat/completions
PreAuth => Coming Soon
Note: Being a client to a service that can take > 60 secs to respond, follow the guidelines recommended here by API Gateway team for better resiliency.
Note: - Accessing the PreAuth endpoint requires security approval. Please ensure you obtain the necessary approval, clone this JIRA ticket https://jira.intuit.com/browse/CMLP-10199, and tag the @llm-gateway-support handle in the #genos-support channel to get your experience_id whitelisted.

Important:Express V3 Streaming
Express V3 offers a streaming endpoint to receive responses from Large Language Models (LLMs) progressively. However, implementation includes a batching mechanism to ensure content is screened for safety and compliance. This makes our streaming behavior different from a "vanilla" LLM stream that sends data token-by-token. To enable streaming response from Express V3 API, Please make sure that you are using this endpoint /v3/stream/{intuit_genos_model_id}/chat/completions and also set "stream": true in the payload.

Important:Usage Statistics
Usage data is enabled by default for all streaming requests. Express V3 automatically includes the stream_options: {"include_usage": true} parameter in its requests to the downstream LLM provider. This means that the usage object, containing prompt_tokens, completion_tokens, and total_tokens, will be available in the final data event of the stream.

Important:Response Batching
This is to outline the internal batching mechanism done by this service for handling streaming chat completion requests. When a client makes a streaming request, the service receives a series of small data chunks (Server-Sent Events) from the downstream Large Language Model (LLM) provider. Instead of forwarding these tiny chunks directly to the client, the service groups them into larger batches. This batching approach is crucial for Effective Risk Screening (It allows the GenSRF service to perform content risk screening on meaningful segments of text).

First Batch Threshold: Around 600 characters
A smaller threshold is used for the first batch to minimize the "time to first byte" (TTFB). This ensures that the user sees the beginning of the response as quickly as possible.

Subsequent Batches Threshold: Around 800 characters
After the first batch is sent, the threshold is increased. Larger batches are more efficient for the risk screening service and reduce the total number of processing operations for a complete response.

Combined Chunk
All the small chunks collected received from the LLM provider are consolidated into a single, new Chat Completion Stream Response object. This combined chunk contains all the aggregated text and the fully assembled tool call information.

Usage and Finish Reason
Both the finish_reason and the usage object are always included in the very last chunk sent to the client. The batching logic is designed to identify the end of the LLM's response stream. It captures the finish_reason (e.g., stop, length, tool_calls) and any usage data provided by the LLM. This information is then consolidated and attached to the final processed batch before it is yielded to the client. This holds true even if the entire response is generated in a single chunk. For very short responses that do not exceed the initial 600-character threshold, the service will process it as the first and only batch. This single chunk will contain: full message content,finish_reason,complete usage object. This provides a consistent and reliable way for clients to determine why a stream ended and to track token consumption without needing to inspect intermediate chunks.

Important:API Spec
For all API endpoints irrespective of swimlanes like non-streaming, long timeout , streaming etc, we will follow OpenAI API Spec for input and output. Here are the references:

Capability	Input	Output
Chat	See here	See here
Embeddings	See here	See here
Important:Response Status Codes
HTTP Status Code	Description
200	Successful operation
400	Bad Request. The request could not be understood or was missing required parameters. "cause" field will call out what is wrong with input that user needs to fix.
422	Risk screening failed for input or output. "cause" field will call out what is wrong with input that user needs to fix. This is not retryable error. User should fix input and try after that.
424	Failed Dependency. LLM call took more than 60 seconds to respond. This is retryable error. User can retry either after sometime or can pass in smaller context.
500	Internal Server Error. Will be used when an unknown/unexpected problem has happened with the service.
502	Bad Gateway. Whenever our external dependencies, like SRF or LLM, are DOWN we will send this status code. "cause" field will call out which external dependency is DOWN for service owners to reach out to them.
Important:Headers
Field	Description/Options	Required
Authorization	PrivateAuth Plus	✅
intuit_experience_id	The experience ID for your Use Case. Refer to Register Your Use Case	✅
intuit_originating_assetalias	This is the asset alias of the DevPortal client asset that initiates the GenOS communication.	✅
intuit_tid	Transaction ID - This value can be set by client by sending the intuit_tid http header with the request. If the header is not set, Gateway will draw from the x-amzn-trace-id header or generate the value to set the intuit_tid header in the response	
Important:API Limits
For request payload size, the limitation is: 85MB
For request headers size, the limitation is: 32KB
Important:Python based examples on how to use any SDK/Library to integrate with GenOS Express V3 APIs
Please follow examples provided and refer to the notebook ExpressModeV3 Example.
Important:JAVA based examples on how to use any SDK/Library to integrate with GenOS Express V3 APIs
A sample application can be found here showing how to use Express V3 APIs with Spring AI.
Important:Examples on how to access through REST APIs
curl --location 'https://llmexecution-e2e.api.intuit.com/v3/gpt-4o-mini-2024-07-18/chat/completions' \
--header 'Authorization: Intuit_IAM_Authentication intuit_appid="CLINET_APP_ID",intuit_app_secret="CLIENT_APP_SECRET",intuit_token_type="IAM-Ticket",intuit_userid="xxx",intuit_token="xxx"' \
--header 'intuit_experience_id: GENOS_USE_CASE_ID' \
--header 'intuit_originating_assetalias: xxx' \
--header 'Content-Type: application/json' \
--data '{
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful tax assistant."
        },
        {
            "role": "user",
            "content": "how can I make find out my marginal tax rate?"
        }
    ],
    "max_tokens": 50,
    "frequency_penalty":1.0
}'

Important:Example Response Body

{
  "id": "chatcmpl-AxxxqSsMIxrLwB5LAeTJu7lDcnVY9",
  "created": 1738855218,
  "model": "gpt-4o-2024-05-13",
  "object": "chat.completion",
  "system_fingerprint": "fp_f3927aa00d",
  "choices": [
    {
      "finish_reason": "length",
      "index": 0,
      "message": {
        "content": "To determine your marginal tax rate, which is the rate at which your next dollar of income will be taxed, follow these steps:\n\n1. **Identify Your Tax Bracket:** U.S. federal income tax uses a progressive tax system with different rates applied",
        "role": "assistant",
        "tool_calls": null,
        "function_call": null
      }
    }
  ],
  "usage": {
    "completion_tokens": 50,
    "prompt_tokens": 36,
    "total_tokens": 86,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  },
  "service_tier": null
}
Important:Support
Please reach out to @llm-gateway-support in #genos-support

Important:FAQs
Important:General
Do I need to specify model name both in body and URL ?
The model that you want to use should be specified in the URL as path param. SDKs do ask for model_name in body but that is no-op for Express v3 APIs as mentioned in Notebook as well.

I am seeing this error
Error code: 403 - {'error_message': 'Asset is denied access to the experience as exp_id <> intuit_originating_asset_alias association does not exist', 'cause': 'Asset is denied access to the experience as exp_id <> intuit_originating_asset_alias association does not exist'}

On AIWorkbench, under your use case, make sure you have the correct experience ID and intuit_originating_asset_alias mentioned. See below example: exp_id-ioaa.png

If you have the right association and you are sending correct values in header, then please reach out to @llm-gateway-support in #genos-support

How can we access vision models and how are they different and what is the process for getting access to vision models in PROD?
Vision as well as non-vision models are using the same backend instance. Model ending with -vision allows you to access the image modality of that model.
In E2E, access to vision models is open for experimentation purposes only. No use of Intuit data is allowed.
For PROD, all vision models are under restricted access and are not available for general use except via IDX paved road.
Process to get access via IDX: Please start a thread on #genos-support channel and tag @genos-image-doc-support on your thread. Once approved by IDX, use-case teams can request access to vision model via workbench portal.
Process to get exception to skip IDX - If for some reason, your use-case is not a good fit to go via IDX paved road, then you can use Express V3 APIs directly. In order to do that, please get approval from your BU's security architect and also get approval from Jimmy Armitage. Once approved, please start a thread on #genos-support channel and tag @llm-gateway-support for model access approval.
Important:Streaming
Streaming: Is streaming supported ?
Yes, streaming is supported for Express V3 APIs (non-PCI swimlane). Please refer this Notebook for streaming examples with OpenAI and Langchain SDKs.

Streaming: When should I use the streaming endpoint?
You should use streaming when improving the perceived performance for your users is important, especially for longer responses. The key takeaway: If the final response is expected to be long and you want to show progress to the user instead of making them wait, streaming is the best choice.

Streaming: When should I AVOID the streaming endpoint?
You should avoid streaming when your application requires the full response at once or when the expected response is very short. The key takeaway: If the response is short or your code can't do anything useful until it has the entire message, use the standard non-streaming endpoint.

Streaming: What happens if the total response is less than 600 characters?
If the entire response is shorter than the first batch threshold (for example, a simple "Yes, that's correct."), the streaming endpoint will send it as a single batch. This batch will contain the full content, the finish_reason, and the usage statistics. In this scenario, the user experience will be very similar to calling the non-streaming endpoint.

Streaming: Is there a performance difference (streaming vs non-streaming)?
For Time to First Byte (TTFB), streaming is faster if the response is long. Your user will see the first 600 characters sooner than they would see the full response from the standard endpoint. For Total Response Time, the non-streaming endpoint might be marginally faster because it doesn't have the overhead of the batching logic and separate screening of response batches. However, this difference is usually negligible.

Streaming: Are streaming chunks sent immediately as LXS receives them from LLM ?
LXS does not send back chunks immediately as LXS receives from the LLM, LXS rather batches those chunks as 600 characters for the first batch and 800 characters for the subsequent batches.

Streaming: Where do I see usage and finish_reason in Streaming ?
usage and finish_reason would be present in the last chunk of the streaming response.

Streaming: How do I interpret the Response Status code for streaming requests ?
For streaming Requests, there are 2 scenarios:

Scenario 1: Response status code before initiation of Model Streaming

If the failure (like input risk screening etc) occurs prior to when model starts streaming, for example risk screening of input itself fails, then the respective status code would be sent similar to non-streaming requests (see here)
Scenario 2: Response status code after initiation of Model Streaming is always 200.

If the Risk Screening failure occurs after streaming response has started and chunks are flowing, then the response status code would always be 200. In this case, the user should look at the finish_reason field in the last chunk of the streaming response to determine if the response screening is successful or not. Please check the below FAQ for sample screening error in streaming response with finish_reason and exception details.
Any other failures (like 5XX from Risk Screening or Model), Response would be sent as data: [DONE] with status code 200. There won't be any finish_reason or exception details in this case. Please reach out to @llm-gateway-support in #genos-support for further investigation.
Streaming: How do I observe screening errors in streaming responses ?
Usage details won't be sent for Screening failures. Following is a sample response for any screening failure in a streaming response with a 200 status code:

data: {"id": "test_id", "choices": [{"index": 0, "finish_reason": "risk_screening_filter", "risk_screening_filter_results": {"message": "Risk Screening failed for LLM generated output", "cause": "A suspicious language is detected"}}], "created": 1752773739, "model": "model_id", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "test_fp", "usage": null}

data: [DONE]

Important:Performance & Capacity
For the same or a similar request sent to same GenOS model, I am seeing varying latencies from GenOS at different times. How can I debug this ?
OR

I am seeing increased HTTP 424 status code from GenOS APIs. My requests are taking longer than 59 secs at GenOS layer. What to do ?
OR

We have started seeing increased latency for our requests. What can be done ?
OR

Getting quota exceeded error from model. What to do ?
OR

Getting 429s from model. How can we increase the quota ?
NOTE: This FAQ is irrespective of whether you are using Express V2 or V3 APIs.

If you are using Pay-as-you-go aka On-demand model capacity, then this is the expected behavior. Please read Service SLA section above.

If you are using provisioned model capacity, please reach out to @llm-gateway-support in #genos-support

How to know if I am using pay-as-you-go or provisioned model capacity ?
If the model name that you are using to call LLMs in GenOS doesn't end with suffixes like -ck, -vep, devx or -tt and etc. ,indicating BUs at Intuit, then it means you are using pay-as-you-go capacity.

What are the suggested patterns to have better availability of LLMs when using Pay-as-you-go aka On-demand model capacity ?
If using Pay-as-you-go aka On-demand model capacity, use one of the following 4 options in case you see 424s or 429s:

At this time, the maximum timeout supported by Express V3 APIs is 300 seconds using Long Timeout API swimlane. See long timeout swimalne here. If even after using that swimlane you are seeing 424s, then see other options below.
Do retries from your client app
Use different model (See available models here)
Use non-GenAI fallback for your use case: Use case owner have to decide what that would be
How do I get dedicated/provisioned/reserved model capacity?
Before requesting dedicated capacity, you need to understand the available service tiers, decide which tier fits your requirements, and follow the approval process.

Understanding Service Tiers

All vendors offer multiple tiers to balance cost, latency, and scale requirements:

Vendor	Default/On-Demand	Priority	Reserved/Provisioned Capacity
OpenAI	Available · All models · No SLA	Available · SLA	Available ("Scale Tier") · SLA
AWS Bedrock	Available · All supported models · No SLA	Available · SLA	Available ("Model Units/Reserved") · SLA
GCP Vertex AI	Available · All supported models · No SLA	Not available	Available ("GSUs") · SLA
For detailed OpenAI tier information with use case examples, see the OpenAI service tiers FAQ.

How to Decide Which Tier to Use

Choose based on two key factors:

SLA Requirements - Do you need guarantees for availability and latency?
Cost Tolerance - What's your budget for the capacity?
Cost Considerations:

Before committing to Priority or Reserved capacity, estimate the cost difference using:

General cost calculation FAQ for all vendors
OpenAI cost estimation FAQ for OpenAI-specific tiers
Bedrock cost estimation FAQ for AWS Bedrock models
Approval Process

Follow these steps to get Priority tier or Provisioned/Reserved capacity:

Calculate cost difference - Use the cost estimation FAQs above to determine monthly costs for each tier

Get BU approval - Discuss cost/budget with your leadership and BU contact point:

BU	Point of Contact
MailChimp	alex_perez@intuit.com, rushit_patel@intuit.com
CreditKarma	jatin.ghia@creditkarma.com
QuickBooks	carlos_ambrozak@intuit.com
DevX	daniel_moise@intuit.com
TT	felipe_kurkowski@intuit.com
VEP	clifford_green@intuit.com
CK	Nash.Ramar@creditkarma.com / martin.song@creditkarma.com / jatin.ghia@creditkarma.com
GenOS Platform or if BU not listed	rachit_chauhan@intuit.com / deepen_mehta@intuit.com
Create JIRA - Clone CMLP-9715 and have your BU contact or Manager comment "Approved"

Request provisioning - Tag @llm-gateway-support in #genos-support with your JIRA link

What is required before running a load test on GenOS for Express V3?
For conducting any sort of load / performance / stress test in GenOS, start a new thread in #genos-support tagging @llm-gateway-support and provide the following:

Use case details (1-2 line summary):
Experience ID:
When do you plan to run the test (in PDT/PST):
Which environment (PRF/PRD): NOTE: If PRD, link to Change Request (CR):
Endpoint you will hit on GenOS (the endpoint includes the model name and orchestration mode):
Load characteristics:
Peak TPS:
Ramp up time to move from 0 to peak TPS:
Total duration of test, including ramp up time:
Avg Input tokens per request:
Avg Output tokens per request:
I want to run a perf test on a model in isolation. How do I know if the model is being used by anyone else?
In the LXS Monitoring Dashboard, the LLM Execution Service Total RPS by LLM chart will show current usage of the model.

Important:Troubleshooting
Important:Monitoring & Debugging
How do I check the RPS (requests per second) and Success & Error rate for API calls for my use-case/app?
You can use the following Splunk queries to check request rates and success/error percentages from API Gateway logs. Replace app=* with your app ID, intuit_experience_id=* with your experience ID, and update the model name in the req path.

Query 1: Stats - Success/Error Count and Percentage by Status

View in Splunk


index=apigateway* app="REPLACE WITH YOUR APP ID" intuit_experience_id="REPLACE WITH YOUR EXP ID"
api=Intuit.data.mlplatform.llmexecutionsvc req=/v3/YOUR-MODEL-NAME/chat/completions
| stats count by gw_gen, status
| eventstats sum(count) AS total_count by gw_gen
| eval percent = round((count / total_count) * 100, 2)
| fields gw_gen status count percent
| sort -count
splunk_lxs_success_error_rps_by_status.png

Query 2: Timechart - Request Count by Status Over Time

View in Splunk


index=apigateway* app="REPLACE WITH YOUR APP ID" intuit_experience_id="REPLACE WITH YOUR EXP ID"
api=Intuit.data.mlplatform.llmexecutionsvc req=/v3/YOUR-MODEL-NAME/chat/completions 
| timechart count by status
splunk_lxs_success_error_percentage.png

Our requests are getting throttled and I am seeing 429 when calling the LLM model through V3 API
If you are seeing 429 errors, check the value of the gw_gen flag from the API Gateway logs to determine the source of throttling.

Scenario 1: gw_gen=T (Throttling from LXS Gateway)

When gw_gen=T, the 429 errors are caused by throttling from the LLM Execution Service (LXS) Gateway configuration for your app. Check whether the throttling is at the App, Experience ID, or User level:

View in Splunk


index=apigateway-prdidx api=Intuit.data.mlplatform.llmexecutionsvc app="REPLACE WITH YOUR APP ID" status=429 gw_gen=T 
| stats count by app, intuit_experience_id, req, phrase, throttleType, throttlePlanName, throttlePlanRuleName, throttlePlanCategory
lxw_throttling_gw_gen-t.png

The throttlePlanName shows the LXS API Gateway throttling plan applied to your app, and throttlePlanRuleName indicates the throttling level (app, experience ID, or user).

Check if there was an increase in traffic for your application, experience ID, or user and whether that increase is expected. If you need a higher throttling limit, please reach out in #genos-support and tag @llm-gateway-support.

Scenario 2: gw_gen=F (Throttling from LLM Model)

When gw_gen=F, the 429 errors are NOT from the LXS Gateway configuration. Instead, they are coming from the LLM model itself, indicating you've hit the model's rate limits.

View in Splunk


index=apigateway-prdidx api=Intuit.data.mlplatform.llmexecutionsvc app="REPLACE WITH YOUR APP ID" intuit_experience_id="REPLACE WITH YOUR EXP ID"
| stats count by app req api status gw_gen phrase
lxw_throttling_gw_gen-f.png

In this case, refer to the guidance in the Performance & Capacity section above for handling 429s from the model itself. Consider implementing retries, using a different model, or requesting provisioned capacity or using Priority tier if applicable.

How do I check the current RPS (requests per second) limit for my use-case/app?
You can check your throttling limits in the LXS DevPortal:

Navigate to the LXS DevPortal - Upstream Clients page
Search for your asset alias or asset ID:
lxs_devportal_upstreamclients_search.png

The page shows your throttling limits across all environments (Prod, Perf, E2E):
lxs_devportal_upstreamclients_throttling_limit.png

Important Notes:

The throttlePlanName may not always reflect the correct limit. Look at the Rule and Max Requests based on the Key Type to see the actual values.
These throttling limits apply when you receive HTTP 429 responses with gw_gen=T (see the throttling FAQ for details).
If you need to increase your limits, contact @llm-gateway-support in #genos-support.
How to know the token counts for the requests for our experience id or app?
You can use the following Splunk queries to check token counts (average and p90) for your experience. Replace REPLACE WITH YOUR EXP ID with your actual experience ID.

Query 1: Timechart - Tokens and Request Counts Over Time - View in Splunk


index=lxs experienceId="REPLACE WITH YOUR EXP ID" "Sending cost attribution event using REST API with payload"
modelName=gpt-5-nano-2025-08-07-oai
| timechart count avg(promptTokens), avg(completionsTokens) p90(promptTokens), p90(completionsTokens)
Timechart_Tokens_and_requests_count_Splunk.png

Query 2: Stats - Token Counts by App, Experience & Model - View in Splunk


index=lxs experienceId="REPLACE WITH YOUR EXP ID"
"Sending cost attribution event using REST API with"
| stats avg(promptTokens), avg(completionsTokens) p90(promptTokens), p90(completionsTokens) by appId, experienceId, modelName
Stats_Token_counts_per_app_experience_model_Splunk.png

How to know the LLM Response time for the requests for our experience id or app?
You can use the following Splunk queries to check LLM Response time (average and p90) in milliseconds for your experience. Replace REPLACE WITH YOUR EXP ID with your actual experience ID.

Query 1: Timechart - LLM Response time and Request Counts Over Time - View in Splunk


index=lxs experienceId="REPLACE WITH YOUR EXP ID" "Sending cost attribution event using REST API with payload"
modelName=gpt-5-nano-2025-08-07-oai
| timechart count avg(llmResponseTime), p90(llmResponseTime)
Timechart_llm-response-time_and_requests_count_Splunk.png

Query 2: Stats - LLM Response time by App, Experience & Model - View in Splunk


index=lxs experienceId="REPLACE WITH YOUR EXP ID" "Sending cost attribution event using REST API with"
| stats avg(llmResponseTime), p90(llmResponseTime) by appId, experienceId, modelName
Stats_llm-response-time_per_app_experience_model_Splunk.png

Important:Pricing & SLA Reference
How do I calculate LLM costs across different vendors and tiers?
You can calculate costs using token pricing from vendor documentation. This approach works for all vendors (OpenAI, AWS Bedrock, GCP Vertex AI).

Step 1: Collect your usage metrics

Use Splunk queries from Monitoring & Debugging to find:

Average input tokens per request
Average output tokens per request
Total API calls per day
Step 2: Find vendor pricing

Get the cost per token from vendor pricing pages:

OpenAI: OpenAI Pricing
AWS Bedrock: AWS Bedrock Pricing
GCP Vertex AI: GCP Vertex AI Pricing
Step 3: Calculate daily cost Daily Cost = (Input Token Cost × Avg Input Tokens × Total Calls) + (Output Token Cost × Avg Output Tokens × Total Calls)

Example:

Model: GPT-4o
Input: $2.50 per 1M tokens
Output: $10.00 per 1M tokens
Usage: 1000 calls/day, 500 input tokens/call, 200 output tokens/call
Daily Cost = ($2.50/1M × 500 × 1000) + ($10.00/1M × 200 × 1000) = $1.25 + $2.00 = $3.25/day Monthly Cost ≈ $97.50

How can I estimate the cost of using Bedrock models (e.g. Anthropic Claude, openai.gpt-oss, Nova etc.)
AWS provides a calculator where you can plug in your expected traffic—Requests per Minute (RPM), token sizes, and hours per day—to estimate monthly cost.

1. Use the AWS Pricing Calculator (Bedrock)

🔗 AWS Bedrock Pricing Calculator

In the calculator, select the model (e.g., gpt-oss-120b) and fill in:

Average requests per minute (e.g., 10 TPS ≈ 600 RPM)
Hours per day at this rate
Average input tokens per request
Average output tokens per request
The calculator will show a Total Monthly Cost based on your inputs.

aws_bedrock_cost_calc.png

2. Check model-specific pricing

🔗 AWS Bedrock Pricing

This page lists the token-based pricing for each OSS model under On-Demand or Provisioned Throughput.

3. Internal note (Intuit)

Published AWS pricing does not include Intuit's enterprise discount, which applies automatically through our AWS account.

What are different service tiers available for OpenAI models?
OpenAI via LXS offers three tiers to balance cost, latency, and scale requirements:

Tier	Description	Key Feature
Default	Pay-as-you-go model. No throughput guarantees.	Standard pricing
Priority Processing	A hybrid model with lower, consistent latency. Priced at a premium (approx. +100%)	Recommended for interactive workloads
Scale Tier	Dedicated throughput capacity. Requires a 30-day minimum commitment for dedicated "token units"	Auto-overflows to default capacity if limit is exceeded (prevents 429 errors)
When to use each tier:

Default Tier: Best for non-time-sensitive workloads, batch processing, or development/testing. Lowest cost but subject to variable latency and potential throttling during high demand.

Priority Processing (OpenAI Priority Tier): Best for user-facing applications where consistent response times matter (e.g., chatbots, real-time assistants). Provides premium latency and reliability benefits on a flexible, pay-as-you-go basis.

Scale Tier (OpenAI Scale Tier): Best for high-volume production workloads requiring guaranteed throughput and predictable costs. Purchase dedicated capacity (input/output tokens per minute). The auto-overflow feature prevents 429 errors by automatically using pay-as-you-go capacity when your reserved capacity is exceeded.

How to request a specific tier:

To use Priority Processing or Scale Tier, get approvals from your BU contact point on the cost. Once approved please reach out in #genos-support and tag @llm-gateway-support for tier configuration and capacity planning.

How can I estimate the cost of using OpenAI models based on different tiers?
OpenAI charges based on input and output tokens. Pricing varies by model and tier:

Pricing by Tier:

Default Tier: Standard pricing
Priority Processing: ~2x standard pricing (~100% premium)
Scale Tier: Custom pricing based on reserved capacity commitment
Steps to Estimate:

Get your token usage - Use Splunk queries from Monitoring & Debugging section to find your average input/output tokens per request
Check current pricing - 🔗 OpenAI Pricing
Apply Intuit discount - Intuit receives ~17% enterprise discount (as of Feb 2026)
Example Calculation (GPT-4o):

Assumptions:
- 10M input tokens, 5M output tokens per month
- Standard pricing: $5/1M input, $15/1M output tokens

Default tier: (10 × $5) + (5 × $15) = $125/month
Priority tier: (10 × $10) + (5 × $30) = $250/month
With 17% discount: $103.75 (default) / $207.50 (priority)

For Scale Tier cost projections, contact @llm-gateway-support in #genos-support.

openai_priority_pricing.png

Illustration
Logo
© 2024 Intuit Inc. All rights reserved.
Suggest a new feature
View help channels
View how-to guides
Provide feedback

View plugin versions

View Development Portal plugins
Developer Service version: 1.18.0
.
