"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
type Item = {
  id: number;
  reference: string;
  title: string;
  reportType: "lost" | "found";
  category: string;
  description: string;
  location: string;
  incidentDate: string;
  imageData?: string | null;
  imageAltText?: string | null;
  createdAt: string;
};
const cats = [
  "Phones & Electronics",
  "Wallets & Bags",
  "Keys",
  "ID Cards & Documents",
  "Jewellery",
  "Clothing",
  "Books",
  "Accessories",
  "Other",
];
const contactPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9][0-9\s().-]{5,}[0-9])$/;
const samples: Item[] = [
  {
    id: 1,
    reference: "LF-2026-00482",
    title: "Black leather wallet",
    reportType: "found",
    category: "Wallets & Bags",
    description: "Compact black wallet with a small silver emblem.",
    location: "Library — Ground Floor",
    incidentDate: "2026-08-17",
    createdAt: "2026-08-17",
  },
  {
    id: 2,
    reference: "LF-2026-00481",
    title: "Silver house keys",
    reportType: "lost",
    category: "Keys",
    description: "Three keys on a blue fabric loop.",
    location: "North residence courtyard",
    incidentDate: "2026-08-16",
    createdAt: "2026-08-16",
  },
  {
    id: 3,
    reference: "LF-2026-00479",
    title: "Wireless earbuds case",
    reportType: "found",
    category: "Phones & Electronics",
    description: "White charging case found near the coffee counter.",
    location: "Community centre café",
    incidentDate: "2026-08-15",
    createdAt: "2026-08-15",
  },
];
const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};
const Mark = ({ kind }: { kind: "lost" | "found" }) => (
  <span className={`status ${kind}`}>
    {kind === "lost" ? "! LOST" : "✓ FOUND"}
  </span>
);
export default function Home() {
  const [items, setItems] = useState(samples),
    [q, setQ] = useState(""),
    [kind, setKind] = useState("all"),
    [cat, setCat] = useState("all"),
    [period, setPeriod] = useState("all"),
    [theme, setTheme] = useState("system"),
    [access, setAccess] = useState(false),
    [big, setBig] = useState(false),
    [contrast, setContrast] = useState(false),
    [motion, setMotion] = useState(false),
    [menu, setMenu] = useState(false),
    [reportKind, setReportKind] = useState<"lost" | "found">("lost"),
    [selected, setSelected] = useState<Item | null>(null),
    [notice, setNotice] = useState(""),
    [descriptionLength, setDescriptionLength] = useState(0),
    [today, setToday] = useState(""),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const report = useRef<HTMLDialogElement>(null),
    detail = useRef<HTMLDialogElement>(null),
    claim = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setTimeout(() => setToday(new Date().toISOString().slice(0, 10)), 0);
    const saved = localStorage.getItem("fa-theme");
    if (saved) setTimeout(() => setTheme(saved), 0);
    fetch("/api/items")
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load reports");
        return r.json();
      })
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setLoadError("");
      })
      .catch(() => {
        setItems([]);
        setLoadError("We couldn't load the community reports. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme =
      theme === "dark" ||
      (theme === "system" && matchMedia("(prefers-color-scheme:dark)").matches)
        ? "dark"
        : "light";
    localStorage.setItem("fa-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle("large", big);
    document.documentElement.classList.toggle("contrast", contrast);
    document.documentElement.classList.toggle("still", motion);
  }, [big, contrast, motion]);
  const shown = useMemo(
    () =>
      items.filter((i) => {
        const age = today
          ? (new Date(today).getTime() - new Date(i.incidentDate).getTime()) /
            864e5
          : 0;
        return (
          `${i.title} ${i.description} ${i.location} ${i.category}`
            .toLowerCase()
            .includes(q.toLowerCase()) &&
          (kind === "all" || i.reportType === kind) &&
          (cat === "all" || i.category === cat) &&
          (period === "all" ||
            (period === "today" && age < 1) ||
            (period === "7" && age <= 7) ||
            (period === "30" && age <= 30))
        );
      }),
    [items, q, kind, cat, period, today],
  );
  const openReport = (k: "lost" | "found") => {
    setReportKind(k);
    setNotice("");
    setTimeout(() => report.current?.showModal(), 0);
  };
  async function submitReport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form),
      file = fd.get("photo") as File,
      requiredFields = [
        ["title", "Item name"],
        ["category", "Category"],
        ["description", "Item description"],
        ["location", "Location"],
        ["incidentDate", "Date"],
        ["reporterContact", "Contact information"],
      ] as const,
      missing = requiredFields
        .filter(([key]) => !String(fd.get(key) || "").trim())
        .map(([, label]) => label);
    if (missing.length) {
      setNotice(`Please complete: ${missing.join(", ")}.`);
      return;
    }
    const contact = String(fd.get("reporterContact") || "").trim();
    if (!contactPattern.test(contact)) {
      setNotice("Please enter a valid email address or phone number.");
      return;
    }
    const description = String(fd.get("description") || "");
    if (description.length > 2000) {
      setNotice("Description cannot exceed 2000 characters.");
      return;
    }
    setNotice("Saving your report…");
    if (file?.size > 1_500_000) {
      setNotice("Please choose an image smaller than 1.5 MB.");
      return;
    }
    if (
      file?.size &&
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setNotice(
        "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
      );
      return;
    }
    let imageData = "";
    if (file?.size)
      imageData = await new Promise<string>((ok) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.readAsDataURL(file);
      });
    const body = Object.fromEntries(fd);
    delete body.photo;
    let res: Response;
    try {
      res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, imageData }),
      });
    } catch {
      setNotice(
        "We couldn't save your report. Your entries are still here—please try again.",
      );
      return;
    }
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      setNotice(
        typeof error?.error === "string"
          ? error.error
          : "We couldn't save your report. Your entries are still here—please try again.",
      );
      return;
    }
    const { item } = await res.json();
    setItems((v) => [item, ...v]);
    setNotice(`Your report has been added. Reference: ${item.reference}`);
    form.reset();
    setDescriptionLength(0);
  }
  async function submitClaim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const missing = [
      ["claimantName", "Your name"],
      ["claimantContact", "Contact information"],
      ["ownershipDetails", "Identifying details"],
    ]
      .filter(([key]) => !String(fd.get(key) || "").trim())
      .map(([, label]) => label);
    if (missing.length) {
      setNotice(`Please complete: ${missing.join(", ")}.`);
      return;
    }
    const contact = String(fd.get("claimantContact") || "").trim();
    if (!contactPattern.test(contact)) {
      setNotice("Please enter a valid email address or phone number.");
      return;
    }
    let res: Response;
    try {
      res = await fetch(`/api/items/${selected.id}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd)),
      });
    } catch {
      setNotice("We couldn't submit your claim. Please try again.");
      return;
    }
    setNotice(
      res.ok
        ? "Your claim has been submitted successfully."
        : "We couldn't submit your claim. Please try again.",
    );
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header>
        <nav className="wrap nav" aria-label="Main navigation">
          <a className="brand" href="#top">
            <b>F</b>FoundAgain
          </a>
          <button
            className="menub"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className={`links ${menu ? "open" : ""}`}>
            <a href="#search">Search Items</a>
            <button onClick={() => openReport("lost")}>Report Lost</button>
            <button onClick={() => openReport("found")}>Report Found</button>
            <a href="#how">How It Works</a>
          </div>
          <div className="tools">
            <button aria-expanded={access} onClick={() => setAccess(!access)}>
              Ⓐ <span>Accessibility</span>
            </button>
            <select
              aria-label="Colour theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          {access && (
            <div className="access">
              <strong>Accessibility preferences</strong>
              <label>
                <input
                  type="checkbox"
                  checked={big}
                  onChange={(e) => setBig(e.target.checked)}
                />{" "}
                Increase text size
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={contrast}
                  onChange={(e) => setContrast(e.target.checked)}
                />{" "}
                High contrast
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={motion}
                  onChange={(e) => setMotion(e.target.checked)}
                />{" "}
                Reduce animations
              </label>
            </div>
          )}
        </nav>
      </header>
      <main id="main">
        <section className="hero" id="top">
          <div className="wrap heroGrid">
            <div>
              <p className="eyebrow">A KINDER WAY TO RECONNECT</p>
              <h1>
                Lost something?<em>Let&apos;s help you find it.</em>
              </h1>
              <p className="lede">
                Search community reports or let others know about something
                you&apos;ve lost or found. No account required.
              </p>
              <div className="buttons">
                <a className="button primary" href="#search">
                  ⌕ Search Items
                </a>
                <button
                  className="button secondary"
                  onClick={() => openReport("lost")}
                >
                  Report an Item
                </button>
              </div>
              <p className="reassure">
                ✓ No signup required · ✓ Free to use · ✓ Accessible to everyone
              </p>
            </div>
            <div className="art" aria-hidden="true">
              <div className="sun"></div>
              <i>⌕</i>
              <i>⌁</i>
              <i>▣</i>
              <div className="mini">
                <Mark kind="found" />
                <b>Someone found your keys</b>
                <small>Library · 12 minutes ago</small>
              </div>
            </div>
          </div>
        </section>
        <section className="search" id="search">
          <div className="wrap panel">
            <p className="eyebrow">COMMUNITY REPORTS</p>
            <h2>What are you looking for?</h2>
            <p>Search by item, category, description, or location.</p>
            <form
              role="search"
              className="searchbar"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="sr" htmlFor="q">
                Search reports
              </label>
              <span>⌕</span>
              <input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for wallet, keys, phone, ID card..."
              />
              <button className="button primary">Search</button>
            </form>
            <div className="filters">
              <label>
                Status
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="all">All reports</option>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
              </label>
              <label>
                Category
                <select value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="all">All categories</option>
                  {cats.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </label>
            </div>
            {loading ? (
              <p role="status" aria-live="polite">
                Loading community reports…
              </p>
            ) : null}
            {loadError && (
              <p className="notice" role="alert">
                {loadError} Refresh the page to retry.
              </p>
            )}
            {!loading && (
              <p aria-live="polite">
                {shown.length} {shown.length === 1 ? "report" : "reports"} found
              </p>
            )}
          </div>
        </section>
        <section className="wrap actions">
          <article className="lostbox">
            <div className="bigicon">!</div>
            <div>
              <Mark kind="lost" />
              <h2>Lost something?</h2>
              <p>Tell the community what you&apos;re looking for.</p>
              <button
                className="button dark"
                onClick={() => openReport("lost")}
              >
                Report Lost Item →
              </button>
            </div>
          </article>
          <article className="foundbox">
            <div className="bigicon">✓</div>
            <div>
              <Mark kind="found" />
              <h2>Found something?</h2>
              <p>Help an item get back to its owner.</p>
              <button
                className="button dark"
                onClick={() => openReport("found")}
              >
                Report Found Item →
              </button>
            </div>
          </article>
        </section>
        <section className="wrap reports">
          <p className="eyebrow">RECENTLY REPORTED</p>
          <h2>Latest from the community</h2>
          {shown.length ? (
            <div className="cards">
              {shown.slice(0, 6).map((i) => (
                <article className="card" key={i.id}>
                  {i.imageData ? (
                    <img
                      src={i.imageData}
                      alt={i.imageAltText || "Uploaded image of reported item"}
                    />
                  ) : (
                    <div className="placeholder" aria-hidden="true">
                      {i.category.includes("Key")
                        ? "⌁"
                        : i.category.includes("Phone")
                          ? "▣"
                          : "◇"}
                    </div>
                  )}
                  <div className="cardbody">
                    <Mark kind={i.reportType} />
                    <h3>{i.title}</h3>
                    <p>{i.description}</p>
                    <dl>
                      <div>
                        <dt>Location</dt>
                        <dd>{i.location}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>{formatDate(i.incidentDate)}</dd>
                      </div>
                    </dl>
                    <button
                      className="textlink"
                      onClick={() => {
                        setSelected(i);
                        detail.current?.showModal();
                      }}
                    >
                      View details →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>No matching items found.</h3>
              <p>Try changing your filters or create a lost-item report.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setQ("");
                  setKind("all");
                  setCat("all");
                  setPeriod("all");
                }}
              >
                Clear Filters
              </button>{" "}
              <button
                className="button primary"
                onClick={() => openReport("lost")}
              >
                Report Lost Item
              </button>
            </div>
          )}
        </section>
        <section className="how" id="how">
          <div className="wrap">
            <div className="center">
              <p className="eyebrow">THREE SIMPLE STEPS</p>
              <h2>How FoundAgain works</h2>
            </div>
            <ol>
              <li>
                <span>01</span>
                <h3>Report or search</h3>
                <p>Search existing items or create a clear, private report.</p>
              </li>
              <li>
                <span>02</span>
                <h3>Find a possible match</h3>
                <p>Browse by item, location, category, and date.</p>
              </li>
              <li>
                <span>03</span>
                <h3>Verify and reconnect</h3>
                <p>Submit a claim with details only an owner knows.</p>
              </li>
            </ol>
          </div>
        </section>
        <section className="wrap categories">
          <div className="center">
            <p className="eyebrow">BROWSE BY CATEGORY</p>
            <h2>Everyday things find their way home</h2>
          </div>
          <div>
            {cats.map((x, n) => (
              <button
                key={x}
                onClick={() => {
                  setCat(x);
                  location.hash = "search";
                }}
              >
                <span aria-hidden="true">
                  {["▣", "▱", "⌁", "▤", "◇", "♧", "▥", "◉", "+"][n]}
                </span>
                {x}
              </button>
            ))}
          </div>
        </section>
        <section className="safety">
          <div className="wrap">
            <span className="shield" aria-hidden="true">
              ◇
            </span>
            <div>
              <p className="eyebrow">COMMUNITY SAFETY</p>
              <h2>Return items safely</h2>
              <p>
                When returning valuable items, use your university reception,
                workplace security desk, community management office, or another
                safe public location where possible.
              </p>
            </div>
          </div>
        </section>
        <section className="wrap faq" id="faq">
          <div className="center">
            <p className="eyebrow">GOOD TO KNOW</p>
            <h2>Frequently asked questions</h2>
          </div>
          {[
            [
              "Do I need an account?",
              "No. FoundAgain can be used without creating an account.",
            ],
            [
              "Do I need a photo?",
              "No. Photos are always optional; a clear text description is enough.",
            ],
            [
              "Can someone who is blind use the portal?",
              "Yes. The portal supports screen readers, keyboard navigation, and text-based reporting.",
            ],
            [
              "How do I claim an item?",
              "Open the item and select “I Think This Is Mine.”",
            ],
            [
              "Will my phone number or email be publicly displayed?",
              "No. Private contact information never appears publicly.",
            ],
            [
              "What if someone falsely claims my item?",
              "Use private identifying details to verify ownership before returning an item.",
            ],
          ].map(([a, b], n) => (
            <details key={a} open={n === 0}>
              <summary>
                {a}
                <span>+</span>
              </summary>
              <p>{b}</p>
            </details>
          ))}
        </section>
        <section className="cta">
          <div className="wrap">
            <p className="eyebrow">
              ONE SMALL ACTION CAN MAKE SOMEONE&apos;S DAY
            </p>
            <h2>Help something find its way home.</h2>
            <div className="buttons center">
              <button
                className="button light"
                onClick={() => openReport("lost")}
              >
                ! Report Lost Item
              </button>
                <button
                className="button outline"
                onClick={() => openReport("found")}
              >
                ✓ Report Found Item
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap foot">
          <div>
            <a className="brand" href="#top">
              <b>F</b>FoundAgain
            </a>
            <p>
              Built to help communities reconnect people with their belongings.
            </p>
          </div>
          <nav aria-label="Footer">
            <a href="#search">Search</a>
            <button onClick={() => openReport("lost")}>Report Lost</button>
            <button onClick={() => openReport("found")}>Report Found</button>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </footer>
      <dialog ref={report} className="modal" aria-labelledby="report-dialog-title">
        <form method="dialog" className="modalhead">
          <div>
            <Mark kind={reportKind} />
            <h2 id="report-dialog-title">Report a {reportKind} item</h2>
          </div>
          <button aria-label="Close">×</button>
        </form>
        <form className="form" onSubmit={submitReport} noValidate>
          <input type="hidden" name="reportType" value={reportKind} />
          <div className="formgrid">
            <label>
              Item name
              <input name="title" required placeholder="Black wallet" />
              <small>Use a short, recognisable name.</small>
            </label>
            <label>
              Category
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Choose a category
                </option>
                {cats.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              Item description
              <textarea
                name="description"
                required
                rows={4}
                maxLength={2000}
                aria-describedby="description-help description-count"
                onChange={(e) => setDescriptionLength(e.target.value.length)}
              />
              <small>
                <span id="description-help">
                  Describe colour, brand, size, markings, contents, or other
                  useful identifying details. Maximum 2,000 characters.
                </span>{" "}
                <span id="description-count" aria-live="polite">
                  {descriptionLength} / 2000
                </span>
              </small>
            </label>
            <label>
              Location
              <input
                name="location"
                required
                placeholder="Library — Ground Floor"
              />
            </label>
            <label>
              Date {reportKind}
              <input
                name="incidentDate"
                type="date"
                required
                max={today || undefined}
              />
            </label>
            <label className="wide">
              Photo <span>(optional)</span>
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
              <small>JPEG, PNG, or WebP. Maximum 1.5 MB.</small>
            </label>
            <label className="wide">
              Describe this image <span>(optional)</span>
              <input
                name="imageAltText"
                placeholder="Black leather wallet with a silver logo"
              />
              <small>
                Help people using screen readers understand the image.
              </small>
            </label>
            <label className="wide">
              Private verification detail <span>(optional)</span>
              <textarea name="privateVerificationDetail" rows={2} />
              <small>This information will not be shown publicly.</small>
            </label>
            <label className="wide">
              Your email or phone
              <input
                name="reporterContact"
                required
                inputMode="text"
                autoComplete="email"
              />
              <small>
                Kept private and used only to coordinate a verified return.
              </small>
            </label>
          </div>
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
          <button className="button primary full">Submit report</button>
        </form>
      </dialog>
      <dialog ref={detail} className="modal" aria-labelledby="detail-dialog-title">
        <form method="dialog" className="modalhead">
          <div>
            {selected && <Mark kind={selected.reportType} />}
            <h2 id="detail-dialog-title">{selected?.title}</h2>
          </div>
          <button aria-label="Close">×</button>
        </form>
        {selected && (
          <div className="detail">
            {selected.imageData && (
              <img
                src={selected.imageData}
                alt={selected.imageAltText || "Uploaded image of reported item"}
              />
            )}
            <p className="ref">Reference {selected.reference}</p>
            <p>{selected.description}</p>
            <dl>
              <div>
                <dt>Category</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selected.location}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(selected.incidentDate)}</dd>
              </div>
            </dl>
            <button
              className="button primary full"
              onClick={() => {
                detail.current?.close();
                setNotice("");
                claim.current?.showModal();
              }}
            >
              I Think This Is Mine
            </button>
            <p className="privacy">
              Your details are sent privately and never shown publicly.
            </p>
          </div>
        )}
      </dialog>
      <dialog ref={claim} className="modal" aria-labelledby="claim-dialog-title">
        <form method="dialog" className="modalhead">
          <div>
            <p className="eyebrow">PRIVATE CLAIM</p>
            <h2 id="claim-dialog-title">Tell us why it&apos;s yours</h2>
          </div>
          <button aria-label="Close">×</button>
        </form>
        <form className="form" onSubmit={submitClaim} noValidate>
          <label>
            Your name
            <input name="claimantName" required autoComplete="name" />
          </label>
          <label>
            Contact information
            <input
              name="claimantContact"
              required
              inputMode="text"
              autoComplete="email"
            />
            <small>Email or phone. This is kept private.</small>
          </label>
          <label>
            Why do you believe this item belongs to you?
            <textarea name="ownershipDetails" required rows={5} />
            <small>Describe something only the owner is likely to know.</small>
          </label>
          <p className="notice" role="status" aria-live="polite">
            {notice}
          </p>
          <button className="button primary full">Submit claim</button>
        </form>
      </dialog>
    </>
  );
}
