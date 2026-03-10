# Advanced AWS -  Week 5


### Homework Day 1 - Intro to serverless AWS

Students must submit a short Markdown file (or Google Docs) with:

Assets:

Lambad Function:

```javascript
export const handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event));

  // TODO implement
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Hello from Lambda!",
      path: event?.rawPath ?? null,
      method: event?.requestContext?.http?.method ?? null,
      time: new Date().toISOString()
    })
  };
  
  return response;
};
```

### A) Proof screenshots

1. Lambda function list showing `lv4-week6-hello`
2. Lambda test result showing success
3. API Gateway HTTP API page showing:
   * route `GET /hello`
   * invoke URL
4. Postman request + response (200)
5. CloudWatch log stream with the “Incoming event” line

### B) Concept questions

1. In one paragraph: What problem does API Gateway solve that Lambda alone does not?
2. Why does the Lambda proxy response require `statusCode`, `headers`, and **string** `body`?
3. What are the free-tier headline limits for:
   * API Gateway HTTP API calls
   * Lambda requests/compute
