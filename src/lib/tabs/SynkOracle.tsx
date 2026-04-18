import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Globe, Lock, RefreshCw, Sparkles, Video } from "lucide-react";
import { motion } from "motion/react";
import { exportAsImage } from "../utils";
import { useSYNK } from "../Store";
import { uploadUserMedia } from "../mediaStorage";

interface OracleQuote {
  track: string;
  category: "DEBT_MANAGEMENT" | "ACADEMIC_PRESSURE" | "SOCIAL_ANXIETY" | "CAREER_AMBITION";
  status: "GREAT_LUCK" | "STABLE" | "CAUTION";
  kr: string;
  tc: string;
  en: string;
  keyword: string;
  advice: string;
}

type LifePost = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  note: string;
  createdAt: string;
};

type PrivacyMode = "private" | "public";

type DirectiveEvidence = {
  id: string;
  mediaType: "image" | "video";
  url: string;
  caption: string;
  timestamp: string;
  privacy: PrivacyMode;
  linkedDirectiveID: string;
};

type EvidenceMap = Record<string, DirectiveEvidence[]>;

const ORACLE_DB: OracleQuote[] = [
  {
    track: "Supernova",
    category: "CAREER_AMBITION",
    status: "GREAT_LUCK",
    kr: "나는 내 모든 걸 걸고 너에게로 가고 있어",
    tc: "我正賭上我的一切。向著你奔馳而去。",
    en: "I am staking everything I have, sprinting towards you.",
    keyword: "VELOCITY",
    advice: "當你決定賭上一切時，對手就已經輸了。保持你的瞬發力。",
  },
  {
    track: "Drama",
    category: "SOCIAL_ANXIETY",
    status: "GREAT_LUCK",
    kr: "I'm the Drama",
    tc: "我就是 Drama 本身。",
    en: "I'm the total Drama.",
    keyword: "PROTAGONIST",
    advice: "你必須是讓收視率飆升的主角。盡情綻放。",
  },
  {
    track: "Lucid Dream",
    category: "ACADEMIC_PRESSURE",
    status: "STABLE",
    kr: "마치 꿈을 꾸는 것 같아",
    tc: "就如同進入了一場夢境。",
    en: "It feels just like traversing a dream.",
    keyword: "LUCIDITY",
    advice: "清晰的頭腦只屬於那些睡得夠好的人。",
  },
  {
    track: "Armageddon",
    category: "DEBT_MANAGEMENT",
    status: "CAUTION",
    kr: "끝이 아닌 새로운 시작",
    tc: "這不是終結，而是嶄新的起始。",
    en: "Not an ending, but a new genesis.",
    keyword: "GENESIS",
    advice: "清理舊帳，你的末日正是新紀元的黎明。",
  },
];

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export default function SynkOracle() {
  const { goals, user } = useSYNK();
  const [result, setResult] = useState<OracleQuote | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyMode>("private");
  const [captureError, setCaptureError] = useState("");
  const [showSnapLayer, setShowSnapLayer] = useState(false);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingCapture, setPendingCapture] = useState<DirectiveEvidence | null>(null);
  const [posts, setPosts] = useLocalStorageState<LifePost[]>("synkify.life.posts", []);
  const [evidenceByDirective, setEvidenceByDirective] = useLocalStorageState<EvidenceMap>("synkify.directiveEvidenceById", {});
  const [dateById] = useLocalStorageState<Record<string, string>>("synkify.dateById", {});
  const [recurrenceById] = useLocalStorageState<Record<string, { type: "none" | "weekly" | "monthly"; days: number[] }>>("synkify.recurrenceById", {});
  const [socialFeed, setSocialFeed] = useLocalStorageState<Array<DirectiveEvidence & { goalId: string }>>("synkify.social.feed", []);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const dailyStats = useMemo(() => {
    const completed = posts.length;
    const today = new Date().toDateString();
    const todayCount = posts.filter((p) => new Date(p.createdAt).toDateString() === today).length;
    return { completed, todayCount };
  }, [posts]);

  const drawCard = () => {
    const randomIndex = Math.floor(Math.random() * ORACLE_DB.length);
    setResult(ORACLE_DB[randomIndex]);
  };

  const appendDirectiveLog = (message: string) => {
    const raw = localStorage.getItem("synkify.directive.activity");
    const prev = raw ? (JSON.parse(raw) as Array<{ id: string; message: string; at: string }>) : [];
    const next = [{ id: crypto.randomUUID(), message, at: new Date().toISOString() }, ...prev];
    localStorage.setItem("synkify.directive.activity", JSON.stringify(next));
  };

  const openPhotoCapture = () => {
    setCaptureError("");
    photoInputRef.current?.click();
  };

  const openVideoCapture = () => {
    setCaptureError("");
    videoInputRef.current?.click();
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read capture file"));
      reader.readAsDataURL(file);
    });

  const handleCaptureSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const mediaType: DirectiveEvidence["mediaType"] = file.type.startsWith("video/") ? "video" : "image";
      if (!user) {
        setCaptureError("Login required before uploading media.");
        return;
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      
      let finalUrl = dataUrl;
      try {
        const upload = await uploadUserMedia({
          file,
          uid: user.uid,
          domain: "oracle",
          onProgress: (p) => setUploadProgress(p)
        });
        finalUrl = upload.downloadURL;
      } catch (uploadErr) {
        console.warn("Cloud Storage upload failed, falling back to local encoding:", uploadErr);
        setUploadProgress(100);
      }
      
      const captured: DirectiveEvidence = {
        id: crypto.randomUUID(),
        mediaType,
        url: finalUrl,
        caption: caption.slice(0, 150),
        timestamp: new Date().toISOString(),
        privacy,
        linkedDirectiveID: "",
      };
      setPendingCapture(captured);
      setIsUploading(false);
      setShowLinkDrawer(true);
      setCaptureError("");
    } catch (err) {
      console.error("Capture encoding error:", err);
      setIsUploading(false);
      setCaptureError(err instanceof Error ? err.message : "Capture failed. Please try again.");
    }
  };

  const todaysActiveDirectives = useMemo(() => {
    const today = new Date();
    return goals.filter((goal) => {
      if (goal.completed) return false;
      return occursOnDate(goal.id, today, dateById, recurrenceById);
    });
  }, [goals, dateById, recurrenceById]);

  const saveLinkedCapture = (goalId: string) => {
    if (!pendingCapture) return;
    const linked = { ...pendingCapture, timestamp: new Date().toISOString(), linkedDirectiveID: goalId };
    setEvidenceByDirective((prev) => ({
      ...prev,
      [goalId]: [linked, ...(prev[goalId] || [])],
    }));
    const newPost: LifePost = {
      id: linked.id,
      mediaType: linked.mediaType,
      mediaUrl: linked.url,
      note: linked.caption,
      createdAt: linked.timestamp,
    };
    setPosts((prev) => [newPost, ...prev]);
    if (linked.privacy === "public") {
      setSocialFeed((prev) => [{ ...linked, goalId }, ...prev]);
    }
    appendDirectiveLog(`Oracle ${linked.mediaType} linked to directive timeline`);
    setIsTransitioning(true);
    window.setTimeout(() => {
      setIsTransitioning(false);
      setShowLinkDrawer(false);
      setShowSnapLayer(false);
      setPendingCapture(null);
      setCaption("");
      setPrivacy("private");
    }, 480);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 md:p-14 pb-32 overflow-y-auto no-scrollbar overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">
        <header className="flex flex-col md:flex-row justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-synk-lavender mb-2">Oracle Live Channel</p>
            <h1 className="vogue-title-page">ORACLE</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start md:self-end">
            <div className="px-4 py-3 border border-white/10 bg-white/[0.02] rounded-xl">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">Live Posts</p>
              <p className="text-xl">{dailyStats.completed}</p>
            </div>
            <div className="px-4 py-3 border border-white/10 bg-white/[0.02] rounded-xl">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">Today</p>
              <p className="text-xl">{dailyStats.todayCount}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 space-y-12 max-w-xl mx-auto pb-20">
          {posts.length === 0 && (
            <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl">
              <p className="text-sm text-white/50">No memory cards yet. Snap and link an activity.</p>
            </div>
          )}
          {posts.map((post) => {
            // Find which directive this post belongs to
            let linkedDirective = goals[0]; // fallback
            for (const [goalId, evidences] of Object.entries(evidenceByDirective)) {
              if (evidences.some((e) => e.id === post.id)) {
                linkedDirective = goals.find((g) => g.id === goalId) || linkedDirective;
                break;
              }
            }

            return (
              <motion.article 
                key={post.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-white/10 overflow-hidden bg-black/40"
              >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-synk-lavender to-synk-pink flex items-center justify-center p-[1px]">
                      <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-[10px] uppercase font-bold">
                        {user?.email?.charAt(0) || "U"}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider">{linkedDirective?.title || "Directive Update"}</p>
                      <p className="text-[10px] text-white/40">{new Date(post.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                {/* Media Content - standardized Instagram 4:5 aspect ratio */}
                <div className="relative aspect-[4/5] bg-black/80 flex items-center justify-center w-full overflow-hidden">
                  {post.mediaType === "image" ? (
                    <img src={post.mediaUrl} alt="Memory" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative group">
                      <video 
                        src={post.mediaUrl} 
                        playsInline 
                        autoPlay 
                        muted 
                        loop 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full p-2 border border-white/10">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Caption */}
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-white/80">
                    <span className="font-bold mr-2 text-white">{user?.displayName || "Agent"}</span>
                    {post.note || "No caption provided."}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </section>
      </div>
      <button
        onClick={() => setShowSnapLayer(true)}
        className="fixed bottom-28 right-8 z-[100] w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-transform"
      >
        <Camera className="w-6 h-6" />
      </button>

      {showSnapLayer && (
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black"
        >
          <motion.div
            animate={isTransitioning ? { scale: 0.84, opacity: 0.2, y: 60 } : { scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="w-full h-full flex flex-col"
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Snap Capture</p>
              <button onClick={() => setShowSnapLayer(false)} className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded-full">
                Close
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="max-w-xl mx-auto w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                {pendingCapture ? (
                  pendingCapture.mediaType === "image" ? (
                    <img src={pendingCapture.url} alt="capture preview" className="w-full max-h-[360px] object-cover rounded-xl border border-white/10" />
                  ) : (
                    <video src={pendingCapture.url} controls className="w-full max-h-[360px] object-cover rounded-xl border border-white/10" />
                  )
                ) : isUploading ? (
                  <div className="h-[280px] rounded-xl border border-white/20 flex flex-col items-center justify-center p-6 gap-4 bg-black/50">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Uploading Media...</p>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: `${Math.round(uploadProgress)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-white/40">{Math.round(uploadProgress)}%</p>
                  </div>
                ) : (
                  <div className="h-[280px] rounded-xl border border-dashed border-white/20 flex items-center justify-center text-white/40 text-sm">
                    Capture a photo or video to continue.
                  </div>
                )}

                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 150))}
                  placeholder="Write a short caption..."
                  className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-sm text-white"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/40">{caption.length}/150</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrivacy("private")}
                      className={`px-3 py-1 rounded-full border text-xs flex items-center gap-1 ${privacy === "private" ? "border-white text-white" : "border-white/15 text-white/60"}`}
                    >
                      <Lock className="w-3 h-3" />
                      Private
                    </button>
                    <button
                      onClick={() => setPrivacy("public")}
                      className={`px-3 py-1 rounded-full border text-xs flex items-center gap-1 ${privacy === "public" ? "border-white text-white" : "border-white/15 text-white/60"}`}
                    >
                      <Globe className="w-3 h-3" />
                      Public
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handleCaptureSelection} disabled={isUploading} className="hidden" />
                  <input ref={videoInputRef} type="file" accept="video/*" capture="environment" onChange={handleCaptureSelection} disabled={isUploading} className="hidden" />
                  <button onClick={openPhotoCapture} disabled={isUploading} className="px-4 py-3 border border-white/20 rounded-lg text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                    <Camera className="w-4 h-4" />
                    Snap Photo
                  </button>
                  <button onClick={openVideoCapture} disabled={isUploading} className="px-4 py-3 border border-white/20 rounded-lg text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                    <Video className="w-4 h-4" />
                    Record Video
                  </button>
                </div>
                {pendingCapture && (
                  <button
                    onClick={() => setShowLinkDrawer(true)}
                    className="w-full px-4 py-3 bg-white text-black text-xs uppercase tracking-[0.25em] rounded-lg font-bold"
                  >
                    Link to Directive
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {showLinkDrawer && pendingCapture && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute left-0 right-0 bottom-0 border-t border-white/15 bg-black/95 p-4 md:p-6"
            >
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Link to Directive</p>
                  <button onClick={() => setShowLinkDrawer(false)} className="text-xs text-white/60">Close</button>
                </div>
                <p className="text-sm text-white/70 mb-4">Choose a pending or active task for today.</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
                  {todaysActiveDirectives.length === 0 && (
                    <div className="text-xs text-white/50 border border-dashed border-white/15 rounded-xl p-3">
                      No active directives for today. Schedule a task in GoalVault first.
                    </div>
                  )}
                  {todaysActiveDirectives.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => saveLinkedCapture(goal.id)}
                      className="text-left border border-white/15 rounded-xl p-3 hover:border-white/35 transition-colors"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-white/40">{goal.type}</p>
                      <p className="text-sm text-white/85 mt-1">{goal.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function occursOnDate(
  goalId: string,
  date: Date,
  dateById: Record<string, string>,
  recurrenceById: Record<string, { type: "none" | "weekly" | "monthly"; days: number[] }>,
) {
  const base = normalizeTaskDate(dateById[goalId]);
  const recurrence = recurrenceById[goalId] ?? { type: "none", days: [] };
  const dateISO = date.toISOString().slice(0, 10);
  if (recurrence.type === "none") {
    return base === dateISO;
  }
  if (recurrence.type === "weekly") {
    const weekDays = recurrence.days.length ? recurrence.days : [new Date(base).getDay()];
    return weekDays.includes(date.getDay());
  }
  const monthDays = recurrence.days.length ? recurrence.days : [new Date(base).getDate()];
  return monthDays.includes(date.getDate());
}

function normalizeTaskDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}
