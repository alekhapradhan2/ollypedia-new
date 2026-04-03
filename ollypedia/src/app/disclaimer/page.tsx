import type { Metadata } from "next";
import { buildMeta, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = buildMeta({
  title: "Disclaimer – Ollypedia",
  description: "Read Ollypedia's disclaimer regarding content accuracy, copyright, and external links.",
  url: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl font-black text-white mb-2">Disclaimer</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: January 2025</p>
      <div className="prose-odia space-y-6">
        <section>
          <h2>General Information</h2>
          <p>The information provided on Ollypedia is for general informational and entertainment purposes only. While we strive to keep information up to date and correct, we make no representations or warranties of any kind about the completeness or accuracy of the information on this website.</p>
        </section>
        <section>
          <h2>Content Accuracy</h2>
          <p>Box office figures, release dates, cast details, and other movie-related information are sourced from publicly available data and may not always be 100% accurate. We encourage users who notice errors to contact us. User-submitted reviews represent individual opinions only.</p>
        </section>
        <section>
          <h2>Copyright &amp; Intellectual Property</h2>
          <p>All movie posters, images, trailers, and songs featured on this website are the property of their respective copyright holders. Ollypedia uses such content under fair use for commentary, criticism, and education. If you are a copyright owner and believe your content is used inappropriately, please contact us at hello@ollypedia.in.</p>
        </section>
        <section>
          <h2>YouTube Embedded Videos</h2>
          <p>Ollypedia embeds YouTube videos for trailers and songs. These videos are hosted on YouTube and subject to YouTube's Terms of Service. We are not responsible for content on YouTube or its availability.</p>
        </section>
        <section>
          <h2>External Links</h2>
          <p>Our website may contain links to external websites provided for your convenience. They do not signify that we endorse the website(s) and we have no responsibility for the content of linked websites.</p>
        </section>
        <section>
          <h2>Advertising</h2>
          <p>Ollypedia may display advertisements through Google AdSense and other networks. The presence of an advertisement does not constitute an endorsement of the advertiser or their products.</p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>For any questions regarding this disclaimer, please <a href="/contact">contact us</a> or email hello@ollypedia.in.</p>
        </section>
      </div>
    </div>
  );
}
