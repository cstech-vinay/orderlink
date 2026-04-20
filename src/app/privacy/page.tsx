import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy — OrderLink" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="20 April 2026">
      <p>
        {LEGAL.companyName} ({LEGAL.brandName}) is the data fiduciary for personal data you
        share with us via {LEGAL.brandName}. This policy describes what we collect, why, and
        how we process it, in accordance with the Digital Personal Data Protection Act 2023
        (India) and other applicable law.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Identifying:</strong> full name, email, mobile (verified via OTP), shipping
          address.
        </li>
        <li>
          <strong>Transactional:</strong> order history, invoice records, payment status.
        </li>
        <li>
          <strong>Attribution:</strong> UTM parameters, referring URL, landing page &mdash;
          captured in sessionStorage, stored against the order only if you place one.
        </li>
        <li>
          <strong>Support:</strong> messages you send us on WhatsApp or email.
        </li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>
          To fulfil your order &mdash; name, mobile, and address are shared with Meesho Logistics
          for delivery.
        </li>
        <li>
          To process payment &mdash; name, email, and amount are shared with Razorpay.
        </li>
        <li>To send order and shipping updates via SMS and email.</li>
        <li>
          To comply with GST invoicing requirements (7-year retention under the CGST Rules).
        </li>
      </ul>

      <h2>Retention</h2>
      <p>
        Order records are retained for 7 years as required by the CGST Act. Non-transactional
        data (UTM attribution, support conversations) is retained for 24 months unless deleted
        sooner on request.
      </p>

      <h2>Data processors we use</h2>
      <ul>
        <li>
          <strong>Salesforce</strong> (
          <a href="https://trust.salesforce.com" target="_blank" rel="noopener">
            trust.salesforce.com
          </a>
          ) &mdash; stores your customer profile, order history, invoice PDFs, and sends your
          order confirmation + invoice emails. ISO 27001, SOC 2 Type II, GDPR-certified.
        </li>
        <li>
          <strong>Razorpay</strong> &mdash; processes payments; RBI-regulated payment aggregator.
        </li>
        <li>
          <strong>Meesho Logistics</strong> &mdash; last-mile delivery.
        </li>
        <li>
          <strong>MSG91</strong> &mdash; OTP delivery for mobile verification.
        </li>
        <li>
          <strong>Sentry</strong> &mdash; error monitoring; PII is scrubbed before events leave
          your browser.
        </li>
      </ul>

      <h2>Your rights under the DPDP Act 2023</h2>
      <ul>
        <li>
          <strong>Right to access:</strong> email{" "}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> with the subject
          &ldquo;Data access request &mdash; order [number]&rdquo; and we&rsquo;ll send you a
          machine-readable copy within 30 days.
        </li>
        <li>
          <strong>Right to correction:</strong> same email flow.
        </li>
        <li>
          <strong>Right to erasure:</strong> we&rsquo;ll redact your personal data from our
          systems. Statutory records are retained where required by law.
        </li>
        <li>
          <strong>Right to grievance:</strong> contact our Grievance Officer{" "}
          {LEGAL.grievanceOfficerName} at {LEGAL.supportEmail} / {LEGAL.supportPhone}.
        </li>
      </ul>

      <h2>Cookies and tracking</h2>
      <p>
        We use only essential cookies (session, CSRF, mobile verification). We do not use
        advertising or cross-site tracking cookies. Cookie preferences can be adjusted via the
        banner on your first visit.
      </p>

      <h2>Data Protection Officer</h2>
      <p>
        {LEGAL.dpoName}, {LEGAL.dpoDesignation} &mdash;{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>, {LEGAL.supportPhone}
      </p>
    </PolicyPage>
  );
}
