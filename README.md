# Introduction to AWS -  Week 5

In this repo we'll talk about setting up AWS tru the console.

### Homework Day 1

Students must submit a short Markdown file (or Google Docs) with:

#### Part A — Concepts (answer + screenshot proof)

1. **S3 Keys vs Prefixes**
   * In 2–4 sentences: What is an object key? What is a prefix?
   * **Screenshot:** S3 console open (bucket list page is enough) + highlight where “folders” appear in S3 UI (even if no bucket yet).
2. **Root security best practice**
   * In 2–4 sentences: Why should root MFA be enabled and root used rarely?
   * **Screenshot:** Root security credentials page showing MFA section (they can blur account ID if needed).
3. **Budgets**
   * In 2–4 sentences: What is an AWS Budget and what do alerts do?
   * **Screenshot:** Budget created (or the “Create budget” screen if not completed).
4. **S3 bucket naming** (short)
   * In 1–2 sentences: why must bucket names be globally unique? (because they become part of S3 endpoints/hostnames; we will see this later in URLs)
   * **Screenshot:** optional—if they start Day 2 early, show the bucket creation page.

#### Screenshot requirements (so grading is easy)

* Must show the browser page **title** and enough UI context to prove it is AWS Console.
* They may blur:
  * AWS account ID
  * email address
* Do **not** blur the relevant setting (MFA enabled indicator, Budget name/threshold, etc.)


### Homework Day 2

#### Part A — Evidence screenshots (required)

1. **Bucket created**
   * Screenshot: S3 bucket list showing your bucket name.
2. **Static website hosting enabled**
   * Screenshot: Bucket **Properties → Static website hosting** showing:
     * Enabled
     * Index document = `index.html`
     * The website endpoint
3. **Public mode proof (temporary)**
   * Screenshot: Bucket **Permissions** page showing Block Public Access disabled (or warning banner)
   * Screenshot: Bucket policy editor showing the `s3:GetObject` public policy
   * Screenshot: Browser showing the site loaded from the website endpoint (HTTP)
4. **Private mode restored (required)**
   * Screenshot: Block Public Access re-enabled
   * Screenshot: Bucket policy removed (empty/no policy)

#### Part B — Concept questions (short answers)

1. Why do you have to disable Block Public Access to make an S3 static website public?
2. Why is the S3 website endpoint not suitable for secure production hosting by itself (hint: HTTP only)?
3. In one sentence: what is the secure pattern we will use with CloudFront?
