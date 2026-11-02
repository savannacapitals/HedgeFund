import type { Metadata } from "next";
import LegalPage from "@/components/ai/LegalPage";

export const metadata: Metadata = { title: "Terms | Savanna AI Opportunities" };

export default function Terms() {
    return (
        <LegalPage
            title="Terms of use"
            updated="2 November 2026"
            sections={[
                ["Who we are", ["Savanna AI Opportunities is a division of Savanna Capitals. We are an independent digital opportunities research and guidance provider. We are not an agent, recruiter, employer or representative of any listed third-party company, and no official partnership is implied unless a platform page says so."]],
                ["What you are paying for", [
                    "Membership (KES 100 for 30 days) pays for access to our directory, guides and updates. It is paid to Savanna only. It is not a payment to any third-party platform.",
                    "Account assistance (USD 15 per platform request) pays for Savanna's guidance with one platform's registration. It does not pay for, and we do not promise, account approval, project allocation, income or employment.",
                ]],
                ["No guarantees", ["Platform availability, eligibility, project allocation and earnings can change at any time and are decided only by the platforms. We do not guarantee that you will be accepted, assigned work or paid. Information may be out of date: check each platform's official site before you act. Where we could not confirm something we say it is not independently verified."]],
                ["Your accounts and credentials", ["You must keep control of your own email, passwords, one-time codes, identity verification and payment details. Do not send them to us. We do not store third-party passwords or authentication codes and will not create accounts on your behalf in ways that breach a platform's terms. You are responsible for following each platform's rules."]],
                ["Honest use", ["Register with accurate details from your real location. Do not use VPNs, false identities or location manipulation to access a platform, and do not ask us to help you do so. We may decline or cancel a request that asks for this."]],
                ["Payments and refunds", ["Access begins only after your payment is verified. Memberships are not renewed automatically: you choose when to renew. If a payment was confirmed in error or a service was not delivered, contact us with your payment reference and we will review it. Refund requests are handled case by case."]],
                ["Changes and contact", ["We may update these terms and the directory as research changes. Continuing to use the service after an update means you accept it. Questions: use the contact details on the Savanna Capitals website."]],
            ]}
        />
    );
}
