import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata = { title: "Contact — OrderLink" };

export default function ContactPage() {
  return (
    <PolicyPage title="Contact us" updated="20 April 2026">
      <h2>Reach us</h2>
      <ul>
        <li>
          Email: <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        </li>
        <li>Phone: {LEGAL.supportPhone}</li>
        <li>
          WhatsApp:{" "}
          <WhatsAppButton
            variant="inline"
            label={LEGAL.whatsappNumber}
            prefill="Hi%20OrderLink%2C%20I%20have%20a%20question"
          />
        </li>
      </ul>

      <h2>Response time commitment</h2>
      <p>
        We respond to every WhatsApp message within{" "}
        <strong>2 hours, Monday–Saturday, 10 AM – 7 PM IST</strong>.
      </p>
      <p>
        Email replies within <strong>24 hours</strong>, including weekends.
      </p>
      <p>
        Orders placed before <strong>3 PM IST</strong> dispatch the same working day via Meesho.
      </p>

      <h2>Registered office</h2>
      <p>
        {LEGAL.companyName}
        <br />
        {LEGAL.registeredAddress.line1}, {LEGAL.registeredAddress.line2}
        <br />
        {LEGAL.registeredAddress.city}, {LEGAL.registeredAddress.state}{" "}
        {LEGAL.registeredAddress.pincode}
        <br />
        {LEGAL.registeredAddress.country}
      </p>

      <h2>Legal identifiers</h2>
      <p>
        CIN: {LEGAL.cin}
        <br />
        GSTIN: {LEGAL.gstin}
      </p>

      <h2>Grievance officer</h2>
      <p>
        {LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation}
        <br />
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> &middot;{" "}
        {LEGAL.supportPhone}
      </p>
    </PolicyPage>
  );
}
