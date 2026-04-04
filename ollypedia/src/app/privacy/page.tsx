import type { Metadata } from "next";
import { buildMeta, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildMeta({
  title: "Privacy Policy – Ollypedia",
  description: "Read Ollypedia's privacy policy. Learn how we collect, use, and protect your personal information.",
  url: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl font-black text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: January 2025</p>

      <div className="prose-odia space-y-6">
        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to {SITE_NAME} ("{SITE_URL}"). We are committed to protecting your personal information
            and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you visit our website.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways, including:</p>
          <ul>
            <li><strong>Personal Data:</strong> When you contact us or submit a review, we may collect your name and email address.</li>
            <li><strong>Usage Data:</strong> We automatically collect certain information when you visit our site, including your IP address, browser type, pages visited, and time spent.</li>
            <li><strong>Cookies:</strong> We use cookies and similar tracking technologies to improve your experience on our site.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our content</li>
            <li>Respond to your comments and questions</li>
            <li>Send you relevant updates if you have opted in</li>
            <li>Monitor and analyze usage patterns to improve user experience</li>
            <li>Display relevant advertising through third-party services like Google AdSense</li>
          </ul>
        </section>

        <section>
          <h2>4. Google AdSense</h2>
          <p>
            We use Google AdSense to display advertisements on our website. Google uses cookies to serve ads
            based on a user's prior visits to our website or other websites. Google's use of advertising cookies
            enables it and its partners to serve ads based on your visit to our site. You may opt out of
            personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
          </p>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>
            Our site may contain links to and embed content from third-party services, including YouTube (for
            video playback). These third parties have their own privacy policies, and we encourage you to read them.
          </p>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <p>
            We implement reasonable technical and organizational measures to protect your personal information.
            However, no method of transmission over the internet or electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2>7. Children's Privacy</h2>
          <p>
            Our website is not directed to children under the age of 13. We do not knowingly collect personal
            information from children under 13.
          </p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting
            the new policy on this page with an updated date.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a href="/contact">our contact page</a> or email us at alekhpradhan3305@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
