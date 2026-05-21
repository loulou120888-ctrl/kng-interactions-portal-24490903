export type SectionBlock =
  | { type: "body"; text: string }
  | { type: "heading"; text: string }
  | { type: "callout"; variant: "info" | "tip" | "warning" | "danger"; title?: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "checklist"; items: string[] };

export interface Lesson {
  id: string;
  title: string;
  description: string;
  estimatedMins: number;
  sections: SectionBlock[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  lessons: Lesson[];
}

export const MODULES: Module[] = [
  {
    id: "welcome",
    title: "Welcome to the Team",
    description: "Understand what KNG Interactions is and your role within it.",
    icon: "🏠",
    gradient: "from-violet-500/20 to-purple-600/10",
    lessons: [
      {
        id: "welcome-1",
        title: "What is KNG Interactions?",
        description: "An overview of the team's purpose and what you are now a part of.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "Welcome to KNG Interactions. You have already passed your interview — this training program exists to make sure you understand exactly how the team operates and what is expected of you from day one.",
          },
          {
            type: "heading",
            text: "Our Purpose",
          },
          {
            type: "body",
            text: "The Interactions team is responsible for creating meaningful, engaging experiences for every guest within the server. We are the front line of the KNG experience — the people guests will remember, for better or worse.",
          },
          {
            type: "callout",
            variant: "info",
            title: "Core Mission",
            text: "Every guest should leave a session feeling welcomed, entertained, and valued. That is our standard. Not occasionally — every time.",
          },
          {
            type: "heading",
            text: "What We Actually Do",
          },
          {
            type: "list",
            items: [
              "Host events, parties, and entertainment sessions on the schedule",
              "Engage directly with guests in meaningful, memorable ways",
              "Log every genuine guest interaction through the portal",
              "Maintain the reputation and professionalism of the KNG brand",
              "Support teammates and contribute to a positive team culture",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Mentor Tip",
            text: "Think of this role less as a job and more as a commitment to quality. Guests do not know what goes on behind the scenes — they only experience the result of your effort.",
          },
        ],
      },
      {
        id: "welcome-2",
        title: "The Team Structure",
        description: "Learn the rank hierarchy and what each level means.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "KNG Interactions has a clear rank structure. Understanding where you sit and who sits above you is essential — it determines who you report to, who can guide you, and how decisions get made.",
          },
          {
            type: "heading",
            text: "Rank Hierarchy",
          },
          {
            type: "list",
            items: [
              "Helper / Member — Entry-level staff. Learning, supporting, building experience.",
              "SLD (Senior Level) — Demonstrated reliability. Trusted with more responsibility.",
              "LD (Lead) — Experienced, capable of leading sessions and guiding juniors.",
              "AUX (Auxiliary) — Senior operational staff. Can manage team logistics and coverage.",
              "ADM (Admin) — Management-level authority. Oversees team standards and decisions.",
              "Manager — Top tier. Full authority over the team and its direction.",
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "Your Starting Point",
            text: "As a newly mentored staff member, you will begin at Helper or Member level. Your rank will grow as you demonstrate consistency, quality, and commitment.",
          },
          {
            type: "heading",
            text: "Chain of Command",
          },
          {
            type: "body",
            text: "Always direct questions, issues, and reports up your chain of command. If your direct senior is unavailable, go one level higher. Do not bypass ranks unnecessarily or take matters into your own hands.",
          },
          {
            type: "callout",
            variant: "warning",
            title: "Important",
            text: "Bypassing the chain of command — going straight to managers for minor issues, or handling things above your rank — is considered poor conduct. When in doubt, ask your direct senior first.",
          },
        ],
      },
    ],
  },

  {
    id: "expectations",
    title: "Team Expectations",
    description: "The standards of conduct, professionalism, and activity required of all staff.",
    icon: "⭐",
    gradient: "from-blue-500/20 to-blue-600/10",
    lessons: [
      {
        id: "expectations-1",
        title: "Professionalism Standards",
        description: "How you are expected to carry yourself as a KNG staff member.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "Professionalism is not optional. It is the baseline expectation for every single member of this team, regardless of rank or experience.",
          },
          {
            type: "heading",
            text: "In-Game Conduct",
          },
          {
            type: "list",
            items: [
              "Represent KNG with maturity and courtesy at all times",
              "Speak clearly and appropriately — no slang, rudeness, or unprofessional language",
              "Remain calm and composed even when situations become difficult",
              "Dress appropriately for your role and the context of the session",
              "Never use your staff position for personal advantage or favouritism",
            ],
          },
          {
            type: "heading",
            text: "Outside the Server",
          },
          {
            type: "body",
            text: "Your conduct reflects on KNG even when you are off-duty. Do not discuss internal team matters publicly. Do not make promises or statements on behalf of the team without authorisation.",
          },
          {
            type: "callout",
            variant: "danger",
            title: "Zero Tolerance",
            text: "Harassment, discrimination, leaking internal information, or deliberately damaging KNG's reputation will result in immediate removal from the team.",
          },
          {
            type: "heading",
            text: "What Good Professionalism Looks Like",
          },
          {
            type: "checklist",
            items: [
              "You greet guests warmly every time you enter a session",
              "You keep personal frustrations out of your interactions",
              "You follow through on commitments — if you say you will do something, you do it",
              "You acknowledge and correct your own mistakes without being defensive",
              "You treat every guest as important, regardless of their status or spend",
            ],
          },
        ],
      },
      {
        id: "expectations-2",
        title: "Activity Requirements",
        description: "What is expected of you in terms of showing up and staying active.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "This team operates on consistency. We cannot deliver a quality experience if staff are absent, unreliable, or barely present. Activity is one of the clearest signals of your commitment.",
          },
          {
            type: "heading",
            text: "Core Activity Expectations",
          },
          {
            type: "list",
            items: [
              "Log onto the server and complete sessions regularly — not just occasionally",
              "Check the schedule frequently to stay aware of upcoming slots and commitments",
              "Attend your scheduled slots unless you have given advance notice of unavailability",
              "Log interactions through the portal during every active session",
              "Stay in communication with your team, especially if your availability changes",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Scheduled Slots",
            text: "If you cannot attend a slot you are booked for, notify your chain of command as early as possible. Simply not showing up — without any notice — is unacceptable.",
          },
          {
            type: "heading",
            text: "What 'Active' Means",
          },
          {
            type: "body",
            text: "Being active is not just about hours online. It is about being present, engaged, and contributing during the time you are there. A staff member who logs in for two hours and genuinely engages with guests is more valuable than someone who is logged in all day doing nothing.",
          },
          {
            type: "callout",
            variant: "tip",
            title: "Mentor Tip",
            text: "If life gets busy and you need to reduce activity temporarily, let your senior know proactively. Being transparent about your availability is always better than going quiet.",
          },
        ],
      },
      {
        id: "expectations-3",
        title: "Code of Conduct",
        description: "The rules and standards every staff member must uphold.",
        estimatedMins: 3,
        sections: [
          {
            type: "body",
            text: "The Code of Conduct exists to protect the team, the guests, and the reputation of KNG. These are not suggestions — they are requirements.",
          },
          {
            type: "heading",
            text: "Non-Negotiables",
          },
          {
            type: "list",
            items: [
              "Treat all guests and teammates with respect, always",
              "Never share internal information, decisions, or communications with outsiders",
              "Do not engage in or encourage behaviour that would embarrass the team",
              "Do not use your position to gain personal benefits at the expense of others",
              "Report misconduct you witness — staying silent makes you complicit",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Consequences",
            text: "Violations of the Code of Conduct are taken seriously. Depending on severity, consequences range from formal warnings to immediate removal. There is no 'just this once'.",
          },
          {
            type: "callout",
            variant: "info",
            title: "Raising Concerns",
            text: "If you witness misconduct or feel uncomfortable about something, bring it to your chain of command privately. Your concern will be treated with discretion.",
          },
        ],
      },
    ],
  },

  {
    id: "interactions",
    title: "The Interactions System",
    description: "Understand what interactions are, how to log them, and the quality standard.",
    icon: "🤝",
    gradient: "from-teal-500/20 to-cyan-600/10",
    lessons: [
      {
        id: "interactions-1",
        title: "What Counts as an Interaction",
        description: "Learn which guest engagements qualify as loggable interactions.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "Not every moment spent in the server counts as an interaction. An interaction is a genuine, deliberate engagement with a guest that adds value to their experience.",
          },
          {
            type: "heading",
            text: "Valid Interactions",
          },
          {
            type: "list",
            items: [
              "Personally welcoming and engaging a guest who is new or alone",
              "Hosting or facilitating a mini-game, activity, or event for guests",
              "Having a meaningful conversation with a guest that enhances their visit",
              "Organising or assisting with a group activity that guests participate in",
              "Delivering a complimentary item or experience that you arranged personally",
            ],
          },
          {
            type: "heading",
            text: "What Does NOT Count",
          },
          {
            type: "list",
            items: [
              "Passively standing near guests without engaging",
              "Brief, transactional acknowledgements ('hey', 'ok', 'cool')",
              "Interactions that another staff member arranged and delivered",
              "Logging interactions you were not personally involved in",
              "Interactions with other staff members rather than guests",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Integrity",
            text: "Never log an interaction you did not personally conduct. Falsifying logs undermines the entire system and is a serious conduct violation. If you are unsure whether something qualifies, ask your senior — do not assume.",
          },
        ],
      },
      {
        id: "interactions-2",
        title: "Logging Interactions Correctly",
        description: "How to use the portal to log interactions accurately.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "The portal is the central system for recording your work. Accurate logging is essential — it is how your contribution is measured and how team performance is tracked.",
          },
          {
            type: "heading",
            text: "What You Need to Log",
          },
          {
            type: "list",
            items: [
              "The guest's in-game ID — this is required for every interaction",
              "The type of interaction (hosting, direct engagement, activity, etc.)",
              "Any relevant notes about the interaction if applicable",
              "The approximate time it took place",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Log Promptly",
            text: "Log interactions as close to the time they happened as possible. Trying to remember details hours later leads to inaccurate records. Get into the habit of logging during or immediately after a session.",
          },
          {
            type: "heading",
            text: "Frequency",
          },
          {
            type: "body",
            text: "Log every qualifying interaction during every active session. Do not batch-log at the end of the week or skip sessions because 'not much happened'. Even one solid interaction per session is worth recording.",
          },
          {
            type: "callout",
            variant: "warning",
            title: "Guest IDs",
            text: "You must have the guest's actual in-game ID to log the interaction. If you don't have it, politely ask them — most guests are happy to share when you explain it is for team records.",
          },
        ],
      },
      {
        id: "interactions-3",
        title: "Quality Over Quantity",
        description: "Why the standard of each interaction matters more than the total count.",
        estimatedMins: 3,
        sections: [
          {
            type: "body",
            text: "The leaderboard tracks your interaction count — but that number is not the only thing that matters. A high count of shallow, forgettable engagements is worth far less than a smaller number of genuinely excellent ones.",
          },
          {
            type: "heading",
            text: "What Makes an Interaction High Quality",
          },
          {
            type: "checklist",
            items: [
              "The guest was genuinely engaged and responded positively",
              "You were focused on them — not distracted or going through the motions",
              "You added something to their experience that would not have happened without you",
              "You left them with a positive impression of KNG",
              "You would be comfortable with management watching that interaction",
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "The Standard Test",
            text: "Ask yourself after every interaction: 'Would this guest remember me positively?' If the answer is yes, you've done your job. If the answer is 'probably not', raise your standard.",
          },
          {
            type: "callout",
            variant: "tip",
            title: "Mentor Tip",
            text: "Do not chase the leaderboard at the expense of quality. Managers notice the difference between staff who are genuinely delivering value and those who are padding their numbers.",
          },
        ],
      },
    ],
  },

  {
    id: "schedule",
    title: "The Schedule System",
    description: "How the schedule works and what your responsibilities are when on slot.",
    icon: "📅",
    gradient: "from-green-500/20 to-emerald-600/10",
    lessons: [
      {
        id: "schedule-1",
        title: "Understanding the Schedule",
        description: "How Events & Parties and Entertainment slots are organised.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "The schedule is the backbone of team operations. It organises all Events & Parties and Entertainment sessions, and ensures coverage is consistent and planned in advance.",
          },
          {
            type: "heading",
            text: "Schedule Categories",
          },
          {
            type: "list",
            items: [
              "Events & Parties — Hosted sessions with activities, games, and guest engagement",
              "Entertainment — Scheduled entertainment slots for specific time periods",
            ],
          },
          {
            type: "body",
            text: "Both categories are managed through the Schedule section of the portal. Slots can be single bookings or recurring templates that repeat on a set pattern.",
          },
          {
            type: "heading",
            text: "Cross-Blocking",
          },
          {
            type: "body",
            text: "The schedule system automatically prevents conflicts. If an Entertainment slot exists at a certain time, it will block that time from being double-booked in Events & Parties, and vice versa. This happens automatically — but it is still your responsibility to check your own commitments.",
          },
          {
            type: "callout",
            variant: "tip",
            title: "Mentor Tip",
            text: "Get into the habit of checking the schedule at the start of each week. Know what is coming up, who is covering what, and whether there are any gaps that need filling.",
          },
        ],
      },
      {
        id: "schedule-2",
        title: "Your Slot Responsibilities",
        description: "What is expected of you before, during, and after a scheduled slot.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "When you are booked into a slot, you are making a commitment. The team and the guests are counting on that slot being covered.",
          },
          {
            type: "heading",
            text: "Before Your Slot",
          },
          {
            type: "checklist",
            items: [
              "Confirm you are aware of the slot time and type",
              "Prepare any materials, activities, or plans needed for the session",
              "Ensure you will be available and logged in on time",
              "If you cannot make it, notify your chain of command immediately",
            ],
          },
          {
            type: "heading",
            text: "During Your Slot",
          },
          {
            type: "checklist",
            items: [
              "Be present, active, and engaged — not AFK or distracted",
              "Actively seek out guests to engage with",
              "Log interactions as they happen",
              "Maintain professional conduct throughout",
            ],
          },
          {
            type: "heading",
            text: "After Your Slot",
          },
          {
            type: "checklist",
            items: [
              "Ensure your interactions are all logged in the portal",
              "Hand off to the next slot holder if applicable",
              "Report anything notable (incidents, complaints, standout guests) to your senior",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "No-Shows",
            text: "Failing to attend a scheduled slot without any prior notice is one of the most disrespectful things you can do to your team. It leaves guests without coverage and puts pressure on everyone else. Repeated no-shows without notice will affect your standing on the team.",
          },
        ],
      },
    ],
  },

  {
    id: "hosting",
    title: "Hosting Standards",
    description: "How to plan and run a session that guests will remember.",
    icon: "🎙️",
    gradient: "from-amber-500/20 to-yellow-600/10",
    lessons: [
      {
        id: "hosting-1",
        title: "Preparing for a Session",
        description: "What to plan and consider before you go live.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "A great session starts before you log in. The more prepared you are, the more confidently and smoothly you can deliver — and guests feel that difference.",
          },
          {
            type: "heading",
            text: "Know Your Session",
          },
          {
            type: "list",
            items: [
              "What type of session is it? (Events & Parties, Entertainment, open engagement)",
              "What activities or formats will you use?",
              "How long is the slot?",
              "How many guests are likely to be present?",
            ],
          },
          {
            type: "heading",
            text: "Have a Plan",
          },
          {
            type: "body",
            text: "Go in with at least a rough structure. An opening, a main activity or engagement phase, and a close. You do not need a script — but 'I'll just wing it' is not good enough when guests are counting on a quality experience.",
          },
          {
            type: "callout",
            variant: "tip",
            title: "Format Ideas",
            text: "Trivia nights, scavenger hunts, racing events, roleplay scenarios, prize giveaways, themed parties — variety keeps guests engaged. Talk to your seniors for formats that have worked well in the past.",
          },
          {
            type: "callout",
            variant: "info",
            title: "Try Something New",
            text: "If you have a new format idea, discuss it with your senior before implementing it. New ideas are encouraged — but they need to be cleared first to ensure they meet team standards.",
          },
        ],
      },
      {
        id: "hosting-2",
        title: "Running an Effective Session",
        description: "How to deliver a high-quality experience from start to finish.",
        estimatedMins: 5,
        sections: [
          {
            type: "body",
            text: "Being in the session is only the beginning. How you carry yourself, how you manage energy, and how you handle unexpected situations determines whether guests have a great time or a forgettable one.",
          },
          {
            type: "heading",
            text: "Opening the Session",
          },
          {
            type: "list",
            items: [
              "Greet guests warmly and enthusiastically — energy is contagious",
              "Set the tone for the session clearly and invite participation",
              "Make newcomers feel especially welcome so they don't feel lost",
            ],
          },
          {
            type: "heading",
            text: "During the Session",
          },
          {
            type: "list",
            items: [
              "Keep the energy up — a quiet host creates a quiet session",
              "Involve as many guests as possible, not just the loudest ones",
              "Stay flexible — if something isn't working, pivot without making it awkward",
              "Keep an eye on the time and pace your content accordingly",
            ],
          },
          {
            type: "heading",
            text: "Closing the Session",
          },
          {
            type: "list",
            items: [
              "Thank guests for participating",
              "End on a positive, memorable note",
              "Log all interactions before you wrap up",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Common Mistake",
            text: "Do not end a session abruptly without a proper close. Guests notice when things just fizzle out. A clear, warm close leaves a better final impression than the entire session might have.",
          },
        ],
      },
    ],
  },

  {
    id: "communication",
    title: "Communication Standards",
    description: "How to communicate effectively with both your team and with guests.",
    icon: "💬",
    gradient: "from-orange-500/20 to-amber-600/10",
    lessons: [
      {
        id: "communication-1",
        title: "Internal Team Communication",
        description: "How to communicate within the team and through the chain of command.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "Clear, respectful, and timely communication within the team keeps everything running. Poor internal communication creates confusion, gaps in coverage, and preventable problems.",
          },
          {
            type: "heading",
            text: "Communication Principles",
          },
          {
            type: "list",
            items: [
              "Be clear and concise — get to the point, avoid rambling",
              "Be timely — do not sit on information that others need to know",
              "Be respectful — regardless of rank or circumstance",
              "Be accurate — do not spread unconfirmed information",
            ],
          },
          {
            type: "heading",
            text: "What to Communicate",
          },
          {
            type: "checklist",
            items: [
              "Your availability changes — notify your senior early",
              "Incidents or complaints during your session",
              "Coverage gaps you notice in the schedule",
              "Ideas or feedback you want to raise",
              "Questions you have about expectations or procedures",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Avoid These",
            text: "Do not gossip, speculate, or vent frustrations to other staff members publicly. If you have a problem with a decision or a person, address it privately and through the appropriate channel.",
          },
        ],
      },
      {
        id: "communication-2",
        title: "Guest Communication",
        description: "How to engage with guests in a way that reflects well on KNG.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "Every word you say to a guest represents KNG. The way you communicate shapes their entire impression of the team and the server.",
          },
          {
            type: "heading",
            text: "Tone and Language",
          },
          {
            type: "list",
            items: [
              "Be warm, friendly, and approachable — guests should feel comfortable talking to you",
              "Speak clearly and in complete sentences — not just single-word responses",
              "Match your energy to the context — fun during events, calm during serious situations",
              "Avoid overly casual language or slang that might seem unprofessional",
            ],
          },
          {
            type: "heading",
            text: "Handling Difficult Conversations",
          },
          {
            type: "body",
            text: "Not every guest will be pleasant. Some will be rude, demanding, or frustrated. Your job is to remain composed regardless of how they behave.",
          },
          {
            type: "list",
            items: [
              "Listen fully before responding — do not interrupt",
              "Acknowledge their concern, even if you disagree",
              "Stay calm — never match a guest's negative energy",
              "If the situation escalates, involve a senior member",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Never Do This",
            text: "Never argue with, insult, or dismiss a guest — even if they are in the wrong. You represent the team. Anything you say negatively reflects on everyone. Escalate if needed, but never retaliate.",
          },
        ],
      },
    ],
  },

  {
    id: "situations",
    title: "Handling Situations",
    description: "Common scenarios you will face and how to handle them correctly.",
    icon: "🧩",
    gradient: "from-rose-500/20 to-red-600/10",
    lessons: [
      {
        id: "situations-1",
        title: "Common Scenarios",
        description: "Real situations you will encounter and the right way to respond.",
        estimatedMins: 6,
        sections: [
          {
            type: "body",
            text: "No amount of training can prepare you for every situation — but knowing how to think through them correctly means you will rarely be caught off guard.",
          },
          {
            type: "heading",
            text: "Scenario 1: A Guest Is Being Rude",
          },
          {
            type: "callout",
            variant: "info",
            title: "Situation",
            text: "A guest begins making rude comments during your event, disrupting the atmosphere for others.",
          },
          {
            type: "list",
            items: [
              "Remain calm and do not respond emotionally",
              "Politely but firmly redirect: 'Let's keep things positive for everyone'",
              "If behaviour continues, privately contact a senior member",
              "Document the incident after the session for your report",
            ],
          },
          {
            type: "heading",
            text: "Scenario 2: You Notice an Uncovered Schedule Slot",
          },
          {
            type: "callout",
            variant: "info",
            title: "Situation",
            text: "You check the schedule and notice a slot that has no one booked for it.",
          },
          {
            type: "list",
            items: [
              "Notify your senior or a manager immediately",
              "If you are available and able, offer to cover it",
              "Do not simply book yourself in without checking with management first",
            ],
          },
          {
            type: "heading",
            text: "Scenario 3: A Teammate Asks You to Log Their Interaction",
          },
          {
            type: "callout",
            variant: "info",
            title: "Situation",
            text: "A fellow staff member asks you to log an interaction on their behalf that you did not witness.",
          },
          {
            type: "callout",
            variant: "danger",
            title: "Answer: Decline",
            text: "You should politely decline. Only log interactions you personally conducted. Logging on someone else's behalf — even if they really did do it — is not your role and compromises the integrity of the system.",
          },
          {
            type: "heading",
            text: "Scenario 4: A Guest Complains About Another Staff Member",
          },
          {
            type: "list",
            items: [
              "Listen professionally and take their concern seriously",
              "Do not dismiss it or take sides publicly",
              "Let them know you will pass the concern on",
              "Report it to your senior as soon as possible with the details",
              "Do not confront the staff member yourself",
            ],
          },
        ],
      },
      {
        id: "situations-2",
        title: "Escalation Procedures",
        description: "When and how to escalate situations beyond your level.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "Knowing when something is above your pay grade is a sign of good judgement — not weakness. The escalation path exists to ensure every situation is handled by someone with the right authority.",
          },
          {
            type: "heading",
            text: "When to Escalate",
          },
          {
            type: "list",
            items: [
              "A guest's behaviour is seriously disruptive and not responding to redirection",
              "A complaint is made about a staff member",
              "You are being pressured to do something against the rules",
              "You witness potential misconduct by another staff member",
              "A situation is escalating in a way you cannot control alone",
            ],
          },
          {
            type: "heading",
            text: "How to Escalate",
          },
          {
            type: "list",
            items: [
              "Contact your direct senior first — via internal communications, not publicly",
              "Provide clear, factual details: what happened, when, who was involved",
              "If your senior is unavailable, go one rank higher",
              "Document the situation with notes as soon as you can",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Escalating Is Correct",
            text: "Some staff hesitate to escalate because they worry it looks like they can't handle things. In reality, it is the opposite — escalating appropriately shows good judgement and protects everyone involved.",
          },
          {
            type: "callout",
            variant: "warning",
            title: "Do Not Handle Alone",
            text: "Do not attempt to discipline, ban, or formally warn guests yourself unless you are authorised to do so at your rank. Handle what is within your role and escalate the rest.",
          },
        ],
      },
    ],
  },

  {
    id: "growth",
    title: "Activity & Growth",
    description: "How to stay active, meet expectations, and progress through the team.",
    icon: "🚀",
    gradient: "from-pink-500/20 to-fuchsia-600/10",
    lessons: [
      {
        id: "growth-1",
        title: "Activity Expectations & the Leaderboard",
        description: "How activity is tracked and what the leaderboard tells your seniors.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "The portal's leaderboard tracks interactions logged by staff over time. It is one of several signals your management uses to understand how engaged and active staff members are.",
          },
          {
            type: "heading",
            text: "What the Leaderboard Measures",
          },
          {
            type: "list",
            items: [
              "Number of interactions logged per period",
              "Missed and completed schedule slots",
              "Points earned through quality performance",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "It is Not the Only Metric",
            text: "The leaderboard is an indicator, not the full picture. Quantity alone will not save you if your conduct is poor. Quality, reliability, and teamwork all factor into how management evaluates your performance.",
          },
          {
            type: "heading",
            text: "Staying Active",
          },
          {
            type: "checklist",
            items: [
              "Show up to your scheduled slots consistently",
              "Log every qualifying interaction — do not let things slip through",
              "Keep in touch with your team even during quieter periods",
              "Ask for feedback from your senior regularly",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Mentor Tip",
            text: "A consistent medium-level performer is far more valuable to the team than someone who goes hard for two weeks then disappears for a month. Consistency is what builds trust.",
          },
        ],
      },
      {
        id: "growth-2",
        title: "Progressing Through the Team",
        description: "What it takes to grow your rank and take on more responsibility.",
        estimatedMins: 4,
        sections: [
          {
            type: "body",
            text: "Rank progression in KNG Interactions is based on demonstrated performance — not time served. You will not automatically move up just by being present. You need to earn it.",
          },
          {
            type: "heading",
            text: "What Gets You Promoted",
          },
          {
            type: "list",
            items: [
              "Consistent, high-quality interaction logging",
              "Reliable attendance and slot coverage",
              "Professional conduct without incidents",
              "Taking initiative — stepping up when needed without being asked",
              "Positive feedback from guests and teammates",
              "Demonstrating leadership qualities, even at junior rank",
            ],
          },
          {
            type: "heading",
            text: "What Holds You Back",
          },
          {
            type: "list",
            items: [
              "Inconsistent activity — periods of high output followed by disappearing",
              "Conduct issues or repeated warnings",
              "Poor communication with your chain of command",
              "Negative feedback from guests or teammates",
              "Minimal effort — doing just enough not to be removed",
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "Ask for Feedback",
            text: "Do not wait for a promotion to find out how you are doing. Regularly ask your senior for honest feedback. Knowing where you stand helps you focus your effort in the right areas.",
          },
          {
            type: "callout",
            variant: "tip",
            title: "Final Thought",
            text: "The staff members who progress fastest are not the ones who do the most — they are the ones who are the most consistent, the most reliable, and the most genuinely invested in the team's success. Be that person.",
          },
        ],
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = MODULES.flatMap(m => m.lessons);

export const TOTAL_LESSONS = ALL_LESSONS.length;

export interface QuizQuestion {
  id: string;
  type: "mc" | "tf" | "scenario";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    type: "mc",
    question: "What is the primary purpose of the KNG Interactions team?",
    options: [
      "Enforcing server rules and banning rule-breakers",
      "Creating positive, memorable experiences for guests through direct engagement",
      "Managing the server's in-game economy",
      "Handling technical support and bug reports",
    ],
    correct: 1,
    explanation: "The Interactions team exists to create meaningful, engaging experiences for every guest — that is the core mission.",
  },
  {
    id: "q2",
    type: "tf",
    question: "True or False: Logging interactions is optional for staff members if they feel the session was not notable.",
    options: ["True", "False"],
    correct: 1,
    explanation: "Every qualifying interaction during every active session should be logged. It is not optional.",
  },
  {
    id: "q3",
    type: "mc",
    question: "Which of the following does NOT count as a valid interaction?",
    options: [
      "Hosting a trivia night for a group of guests",
      "Personally welcoming and engaging a guest who is new",
      "Walking past a guest in-game and saying 'hey'",
      "Organising a mini-game that multiple guests participated in",
    ],
    correct: 2,
    explanation: "Brief, transactional acknowledgements like 'hey' are not genuine engagements. A valid interaction adds real value to the guest's experience.",
  },
  {
    id: "q4",
    type: "scenario",
    question: "During your hosted event, a guest begins making rude comments that are disrupting the atmosphere. What is the correct first step?",
    options: [
      "Immediately end the event to avoid further disruption",
      "Publicly call out the guest in front of everyone",
      "Remain calm, politely redirect, and involve a senior if behaviour continues",
      "Ignore them and hope they stop on their own",
    ],
    correct: 2,
    explanation: "Stay composed, professionally redirect the situation, and escalate to a senior if the behaviour continues. Never retaliate or end the event without exhausting other options first.",
  },
  {
    id: "q5",
    type: "tf",
    question: "True or False: It is acceptable to skip a scheduled slot without any notice as long as it is infrequent.",
    options: ["True", "False"],
    correct: 1,
    explanation: "No-shows without notice are unacceptable regardless of frequency. Always notify your chain of command as early as possible if you cannot attend.",
  },
  {
    id: "q6",
    type: "mc",
    question: "What does 'quality over quantity' mean in the context of interactions?",
    options: [
      "Log as many interactions as possible each session to top the leaderboard",
      "Focus only on VIP or high-spending guests",
      "Each interaction should be meaningful and add genuine value to the guest's experience",
      "Complete interactions quickly so you have time to log more",
    ],
    correct: 2,
    explanation: "A smaller number of genuinely excellent interactions is far more valuable than a high count of shallow, forgettable engagements.",
  },
  {
    id: "q7",
    type: "mc",
    question: "What is the correct escalation path when a situation is beyond your ability to handle?",
    options: [
      "Handle it regardless of how difficult it becomes",
      "Post about it in a public in-game channel",
      "Quietly ignore it and move on",
      "Contact your direct senior first, then go higher if they are unavailable",
    ],
    correct: 3,
    explanation: "Always start with your direct senior. If they are unavailable, move one rank higher. Keep escalation private and factual.",
  },
  {
    id: "q8",
    type: "tf",
    question: "True or False: New staff members are expected to resolve all situations independently without seeking guidance.",
    options: ["True", "False"],
    correct: 1,
    explanation: "New staff should absolutely ask for guidance. Knowing when to escalate and when to ask for help is a sign of good judgement, not weakness.",
  },
  {
    id: "q9",
    type: "scenario",
    question: "A fellow staff member asks you to log an interaction on their behalf that you did not personally witness. What do you do?",
    options: [
      "Log it to help them out — it's a team effort",
      "Log it but add a note that it was on their behalf",
      "Decline — only log interactions you personally conducted",
      "Log it and report the staff member afterwards",
    ],
    correct: 2,
    explanation: "Only log interactions you personally conducted. Logging on behalf of others — even with good intentions — compromises the integrity of the system.",
  },
  {
    id: "q10",
    type: "mc",
    question: "Which best describes professional conduct during an in-game session?",
    options: [
      "Using casual language and slang to seem relatable to guests",
      "Remaining respectful, approachable, and helpful at all times",
      "Only engaging with guests who approach you first",
      "Focusing on your own RP activities when guests aren't actively present",
    ],
    correct: 1,
    explanation: "Professional conduct means being actively engaged, respectful, and guest-focused throughout your entire session — not just when it's convenient.",
  },
  {
    id: "q11",
    type: "tf",
    question: "True or False: Staff members are permitted to discuss internal team decisions and communications publicly in-game.",
    options: ["True", "False"],
    correct: 1,
    explanation: "Internal communications are confidential. Discussing team decisions, disciplinary matters, or operational details publicly is a conduct violation.",
  },
  {
    id: "q12",
    type: "scenario",
    question: "You notice a slot on the schedule that appears to have no coverage. What is the correct action?",
    options: [
      "Ignore it — it is not your responsibility",
      "Book yourself in immediately without checking with anyone",
      "Inform a senior staff member and offer to cover if you are available",
      "Cancel all adjacent slots so the gap is not noticeable",
    ],
    correct: 2,
    explanation: "Notify your senior and offer to help. Do not book yourself in without management awareness — always communicate first.",
  },
  {
    id: "q13",
    type: "mc",
    question: "How should you handle a guest who is new and unfamiliar with how the server works?",
    options: [
      "Direct them to a FAQ and carry on with your session",
      "Alert management to deal with them",
      "Assume they will figure it out on their own",
      "Patiently guide them, make them feel welcome, and offer your help",
    ],
    correct: 3,
    explanation: "New guests are exactly the people we are here to serve. A warm, patient welcome turns a confused first visit into a reason for them to return.",
  },
  {
    id: "q14",
    type: "tf",
    question: "True or False: The leaderboard interaction count is the only metric management uses to evaluate staff performance.",
    options: ["True", "False"],
    correct: 1,
    explanation: "The leaderboard is one indicator. Quality, reliability, conduct, and teamwork all factor into how management assesses performance.",
  },
  {
    id: "q15",
    type: "scenario",
    question: "You have a creative new event format idea you'd like to try during your next slot. What is the correct approach?",
    options: [
      "Run it immediately — initiative is encouraged",
      "Discuss the idea with your senior or manager first for approval",
      "Post it publicly to get guest feedback before clearing it internally",
      "Try it once and only mention it if something goes wrong",
    ],
    correct: 1,
    explanation: "New ideas are encouraged, but they must be cleared with management first. This ensures they meet team standards and nothing goes wrong unexpectedly.",
  },
  {
    id: "q16",
    type: "mc",
    question: "What does the schedule's cross-blocking system do?",
    options: [
      "Randomly assigns staff to available slots",
      "Prevents the same guest from attending multiple events",
      "Automatically blocks conflicting time slots across Events & Parties and Entertainment",
      "Restricts certain events to specific ranks",
    ],
    correct: 2,
    explanation: "Cross-blocking prevents double-booking by automatically cancelling conflicting slots when one category overlaps with another.",
  },
  {
    id: "q17",
    type: "mc",
    question: "A guest approaches you with a complaint about another staff member. What is the correct response?",
    options: [
      "Dismiss it — guests are often just frustrated",
      "Publicly address the staff member in front of the guest",
      "Listen professionally, acknowledge the concern, and escalate to your senior",
      "Handle the complaint yourself to avoid involving management",
    ],
    correct: 2,
    explanation: "Always listen, take the complaint seriously, and pass it up the chain. Do not dismiss it or try to handle it yourself if it involves another staff member's conduct.",
  },
  {
    id: "q18",
    type: "mc",
    question: "Which of the following best describes what earns rank progression in KNG Interactions?",
    options: [
      "The length of time you have been on the team",
      "Having the highest interaction count on the leaderboard",
      "Consistent performance, professional conduct, reliability, and demonstrated initiative",
      "Being friends with senior management",
    ],
    correct: 2,
    explanation: "Progression is earned through demonstrated performance across multiple dimensions — consistency, conduct, reliability, and leadership — not just time or numbers.",
  },
];

export const PASSING_SCORE = 0.8;
