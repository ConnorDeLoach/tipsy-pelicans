import React from "react";

export default function DataDeletion() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">
        User Data Deletion Instructions
      </h1>

      <section className="mb-6">
        <p className="mb-4">
          At Tipsy Pelicans, we respect your right to control your data. If you
          wish to request the deletion of your personal data associated with our
          application, please follow the instructions below.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">
          How to Request Data Deletion
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Send an email to{" "}
            <a
              href="mailto:tipsy@tipsypelicans.com"
              className="text-blue-600 hover:underline"
            >
              tipsy@tipsypelicans.com
            </a>
            .
          </li>
          <li>
            Use the subject line: <strong>"Data Deletion Request"</strong>.
          </li>
          <li>
            In the body of the email, please include your account email address
            or username so we can locate your data.
          </li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">What Happens Next?</h2>
        <p className="mb-2">Upon receiving your request, we will:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Verify your identity to ensure the request is legitimate.</li>
          <li>
            Delete your personal identifiable information from our active
            databases.
          </li>
          <li>Notify you via email once the deletion process is complete.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Please note that some data may be retained in our backups for a
          limited period or as required by law, but it will not be actively
          used.
        </p>
      </section>
    </div>
  );
}
