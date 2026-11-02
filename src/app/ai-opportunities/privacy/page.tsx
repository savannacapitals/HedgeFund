import type { Metadata } from "next";
import LegalPage from "@/components/ai/LegalPage";

export const metadata: Metadata = { title: "Privacy | Savanna AI Opportunities" };

export default function Privacy() {
    return (
        <LegalPage
            title="Privacy notice"
            updated="2 November 2026"
            sections={[
                ["What we collect", [
                    "Account details you give when you sign up (name, email). Payment references and amounts for membership and assistance orders. Your saved platforms, recently viewed platforms and self-reported progress. For assistance requests: the platform, your description of the problem and an optional contact preference.",
                ]],
                ["What we do not want", ["Do not send us passwords, one-time codes, PINs, card numbers or identity documents. We never need them for our service and the request form asks you not to include them."]],
                ["Why we use it", ["To give you access to the guides you paid for, to confirm payments, to run and improve assistance requests, and to show your own dashboard. We do not sell your personal information."]],
                ["Who can see it", ["Authorised Savanna staff can see assistance requests and payment records to do their work, and their actions are logged. Payment providers and banks see what they need to process a payment. Your lists and progress are private to you."]],
                ["Safeguards", ["Member-only content and your records are protected by sign-in checks on our servers, and administrative areas are restricted to authorised roles."]],
                ["Your choices", ["You can ask us to correct or delete your information, subject to records we must keep for payments and security. Contact us using the details on the Savanna Capitals website."]],
            ]}
        />
    );
}
