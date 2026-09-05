"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/components/shared/Toast";

export default function AboutPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Khata — Simple Money Notebook", url });
      } catch {
        // user cancelled — no-op
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast(t("common.linkCopied"));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">
          {locale === "bn" ? "খাতা সম্পর্কে" : "About Khata"}
        </span>
      </div>

      <div className="px-5 flex flex-col gap-5">
        <p className="text-sm text-ink-dim">
          {locale === "bn"
            ? "খাতা একটা সহজ, অফলাইন মানি নোটবুক — কাকে টাকা দিলেন বা কার থেকে নিলেন তার হিসাব রাখার জন্য। কোনো লগইন লাগে না, সব তথ্য আপনার ফোনেই থাকে।"
            : "Khata is a simple, offline money notebook for tracking who you gave money to or took money from. No login needed — everything stays on your phone."}
        </p>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-full border-2 border-accent text-accent font-semibold py-3.5"
        >
          <Share2 size={18} />
          {locale === "bn" ? "অ্যাপটি শেয়ার করুন" : "Share this app"}
        </button>

        <div id="help">
          <h2 className="text-sm font-bold text-ink mb-2">
            {locale === "bn" ? "সাহায্য" : "Help"}
          </h2>
          <p className="text-sm text-ink-dim leading-relaxed">
            {locale === "bn" ? (
              <>
                <b>দিলাম</b> মানে আপনি কাউকে টাকা দিয়েছেন — আপনার ব্যালেন্স কমবে।
                <br />
                <b>নিলাম</b> মানে আপনি কারো থেকে টাকা নিয়েছেন — আপনার ব্যালেন্স বাড়বে।
                <br />
                কোনো ব্যক্তির পাশে <b>&quot;দিয়েছি&quot;</b> মানে আপনি তাকে বেশি টাকা দিয়েছেন; <b>&quot;নিয়েছি&quot;</b> মানে আপনি তার থেকে বেশি টাকা নিয়েছেন।
              </>
            ) : (
              <>
                <b>Gave</b> means you gave money to someone — your balance goes down.
                <br />
                <b>Got</b> means you received money from someone — your balance goes up.
                <br />
                Next to a person, <b>&quot;Owes you&quot;</b> means they owe you money; <b>&quot;You owe&quot;</b> means you owe them.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
