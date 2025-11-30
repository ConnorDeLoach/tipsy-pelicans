import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
        <p className="mb-2">
          Welcome to Tipsy Pelicans ("we," "our," or "us"). We are committed to
          protecting your privacy. This Privacy Policy explains how we collect,
          use, and safeguard your information when you use our application.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          2. Information We Collect
        </h2>
        <p className="mb-2">We collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Information You Provide:</strong> We collect information
            that you voluntarily provide to us, such as your name, email
            address, and game statistics when you register or use our services.
          </li>
          <li>
            <strong>Basic Telemetry:</strong> We may collect basic usage data
            (telemetry) to help us improve the performance and reliability of
            our application. This data is anonymized where possible.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          3. How We Use Your Information
        </h2>
        <p className="mb-2">
          We use the information we collect for the following purposes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>To provide and maintain our service.</li>
          <li>To improve user experience and application performance.</li>
          <li>
            To communicate with you regarding your account or updates to our
            service.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          4. Data Sharing and Disclosure
        </h2>
        <p className="mb-2">
          <strong>We do not sell your personal data.</strong> We do not share
          your personal information with third parties except as described in
          this policy or as required by law.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
        <p className="mb-2">
          We retain your personal information only for as long as is necessary
          for the purposes set out in this Privacy Policy.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
        <p className="mb-2">
          If you have any questions about this Privacy Policy, please contact us
          at:
          <a
            href="mailto:tipsy@tipsypelicans.com"
            className="text-blue-600 hover:underline ml-1"
          >
            tipsy@tipsypelicans.com
          </a>
        </p>
      </section>
    </div>
  );
}
