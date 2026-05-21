export type SectionBlock =
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
    description: "What KNG Interactions is and where you fit in.",
    icon: "🏠",
    gradient: "from-violet-500/20 to-purple-600/10",
    lessons: [
      {
        id: "welcome-1",
        title: "KNG Interactions & You",
        description: "The team's mission and how it's structured.",
        estimatedMins: 3,
        sections: [
          {
            type: "heading",
            text: "Our Mission",
          },
          {
            type: "list",
            items: [
              "Create memorable, positive experiences for every guest",
              "Be the front line of the KNG brand — every session",
              "Every guest should leave feeling welcomed, entertained, and valued",
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "The Standard",
            text: "Guests don't see the work behind the scenes. They only see you.",
          },
          {
            type: "heading",
            text: "Team Ranks",
          },
          {
            type: "list",
            items: [
              "Helper / Member — Learning, supporting, building experience",
              "SLD / LD — Proven reliability, capable of leading sessions",
              "AUX — Senior operations, manages team logistics",
              "ADM / Manager — Full management authority over the team",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Your Starting Point",
            text: "You begin at Helper or Member. Rank grows through consistent, quality performance — not time.",
          },
        ],
      },
    ],
  },

  {
    id: "expectations",
    title: "Team Expectations",
    description: "The conduct and activity standards every member must meet.",
    icon: "⭐",
    gradient: "from-blue-500/20 to-blue-600/10",
    lessons: [
      {
        id: "expectations-1",
        title: "Professionalism & Conduct",
        description: "How you carry yourself as a KNG staff member.",
        estimatedMins: 3,
        sections: [
          {
            type: "heading",
            text: "The Standard",
          },
          {
            type: "checklist",
            items: [
              "Speak professionally — no slang, no rudeness",
              "Stay calm under pressure — always",
              "Never use your position for personal gain",
              "Keep internal team matters off public channels",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Zero Tolerance",
            text: "Harassment, leaking internal information, or damaging KNG's reputation means immediate removal.",
          },
          {
            type: "heading",
            text: "In Practice",
          },
          {
            type: "checklist",
            items: [
              "Greet every guest warmly — every time",
              "Own your mistakes without being defensive",
              "Follow through on every commitment you make",
              "If you wouldn't be proud of management watching — don't do it",
            ],
          },
        ],
      },
      {
        id: "expectations-2",
        title: "Activity & Attendance",
        description: "What showing up actually means on this team.",
        estimatedMins: 3,
        sections: [
          {
            type: "heading",
            text: "What's Expected",
          },
          {
            type: "checklist",
            items: [
              "Run sessions and log interactions regularly",
              "Cover every slot you're booked for",
              "Check the schedule every week",
              "Stay in communication with your team",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Scheduled Slots",
            text: "Missing a slot without notice is one of the most disrespectful things you can do to your team.",
          },
          {
            type: "heading",
            text: "If You Can't Make It",
          },
          {
            type: "list",
            items: [
              "Notify your chain of command as early as possible",
              "Give as much notice as you can — not at the last minute",
              "Never just go quiet. Always communicate.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "interactions",
    title: "The Interactions System",
    description: "What interactions are, how to log them, and why quality matters.",
    icon: "🤝",
    gradient: "from-teal-500/20 to-cyan-600/10",
    lessons: [
      {
        id: "interactions-1",
        title: "What Counts & How to Log",
        description: "Valid interactions and how to record them correctly.",
        estimatedMins: 4,
        sections: [
          {
            type: "heading",
            text: "Valid Interactions",
          },
          {
            type: "checklist",
            items: [
              "Personally welcoming and engaging a new or alone guest",
              "Hosting or running an activity guests participated in",
              "A meaningful conversation that enhanced their visit",
              "Delivering a complimentary experience you personally arranged",
            ],
          },
          {
            type: "heading",
            text: "Does NOT Count",
          },
          {
            type: "list",
            items: [
              "Passively standing near guests without engaging",
              "Brief, transactional responses — 'hey', 'ok', 'cool'",
              "Interactions another staff member conducted",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Integrity",
            text: "Never log an interaction you didn't personally conduct. Falsifying logs is a serious violation — no exceptions.",
          },
          {
            type: "heading",
            text: "Logging Rules",
          },
          {
            type: "list",
            items: [
              "You need the guest's in-game ID for every log",
              "Log during or immediately after the session",
              "Log every qualifying interaction — don't skip sessions",
            ],
          },
        ],
      },
      {
        id: "interactions-2",
        title: "Quality Over Quantity",
        description: "Why the standard of each interaction matters more than the count.",
        estimatedMins: 2,
        sections: [
          {
            type: "callout",
            variant: "info",
            title: "The Standard Test",
            text: "After every interaction — ask yourself: Would this guest remember me positively? If yes, great. If not, raise your standard.",
          },
          {
            type: "heading",
            text: "High Quality Looks Like",
          },
          {
            type: "checklist",
            items: [
              "The guest was genuinely engaged and responded positively",
              "You were fully focused — not going through the motions",
              "You added something they wouldn't have had without you",
              "You'd be comfortable with management watching that interaction",
            ],
          },
          {
            type: "heading",
            text: "The Leaderboard",
          },
          {
            type: "list",
            items: [
              "Tracks interaction count per period — one of several signals",
              "Quantity alone won't save you if quality is poor",
              "Consistent medium output is worth more than sporadic bursts",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "schedule",
    title: "The Schedule System",
    description: "How the schedule works and what your slot responsibilities are.",
    icon: "📅",
    gradient: "from-green-500/20 to-emerald-600/10",
    lessons: [
      {
        id: "schedule-1",
        title: "Slots & Responsibilities",
        description: "Understanding the schedule and what's expected of you.",
        estimatedMins: 4,
        sections: [
          {
            type: "heading",
            text: "Two Types of Slots",
          },
          {
            type: "list",
            items: [
              "Events & Parties — hosted activities, games, guest engagement",
              "Entertainment — scheduled entertainment sessions",
              "Both use the portal's Schedule section — check it every week",
            ],
          },
          {
            type: "heading",
            text: "Before Your Slot",
          },
          {
            type: "checklist",
            items: [
              "Know the time, type, and what you're running",
              "Have a plan or format ready",
              "Be online and present on time",
              "Can't make it? Notify management immediately — not on the day",
            ],
          },
          {
            type: "heading",
            text: "After Your Slot",
          },
          {
            type: "checklist",
            items: [
              "All interactions logged in the portal",
              "Hand off to the next slot holder if applicable",
              "Report incidents or notable moments to your senior",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "No-Shows",
            text: "Failing to attend without any notice leaves guests uncovered and pressures the whole team. Repeated no-shows affect your standing.",
          },
        ],
      },
    ],
  },

  {
    id: "hosting",
    title: "Hosting Standards",
    description: "How to plan and run a session guests will remember.",
    icon: "🎙️",
    gradient: "from-amber-500/20 to-yellow-600/10",
    lessons: [
      {
        id: "hosting-1",
        title: "Running a Great Session",
        description: "What to prepare and how to deliver from start to finish.",
        estimatedMins: 4,
        sections: [
          {
            type: "heading",
            text: "Before You Go Live",
          },
          {
            type: "list",
            items: [
              "Know your session type and how long you have",
              "Have a format planned — trivia, races, mini-games, themed events",
              "New format idea? Clear it with management first",
            ],
          },
          {
            type: "heading",
            text: "During the Session",
          },
          {
            type: "checklist",
            items: [
              "Open with energy — greet guests enthusiastically",
              "Involve everyone, not just the loudest voices",
              "Stay flexible — pivot if something isn't landing",
              "Keep the pace; a quiet host creates a quiet session",
            ],
          },
          {
            type: "heading",
            text: "Closing Out",
          },
          {
            type: "list",
            items: [
              "Thank guests — end on a high note",
              "Log all interactions before wrapping up",
              "Report anything notable to your senior",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Don't Fizzle",
            text: "Don't let sessions just trail off. A clear, warm close is the last impression guests take with them.",
          },
        ],
      },
    ],
  },

  {
    id: "communication",
    title: "Communication Standards",
    description: "How to communicate with your team and with guests.",
    icon: "💬",
    gradient: "from-orange-500/20 to-amber-600/10",
    lessons: [
      {
        id: "communication-1",
        title: "Communicating Effectively",
        description: "Internal team communication and guest-facing conduct.",
        estimatedMins: 3,
        sections: [
          {
            type: "heading",
            text: "With Your Team",
          },
          {
            type: "checklist",
            items: [
              "Be clear, timely, and respectful",
              "Report: availability changes, incidents, schedule gaps, ideas",
              "Keep issues private — address them through the chain of command",
              "No gossip or public venting — ever",
            ],
          },
          {
            type: "heading",
            text: "With Guests",
          },
          {
            type: "checklist",
            items: [
              "Warm, friendly, and approachable at all times",
              "Full sentences — not one-word responses",
              "Stay calm even when a guest is rude",
              "Listen fully before you respond",
            ],
          },
          {
            type: "callout",
            variant: "danger",
            title: "Non-Negotiable",
            text: "Never argue with, insult, or dismiss a guest — even if they're wrong. You represent KNG. Escalate if needed. Never retaliate.",
          },
        ],
      },
    ],
  },

  {
    id: "situations",
    title: "Handling Situations",
    description: "Common scenarios and how to escalate correctly.",
    icon: "🧩",
    gradient: "from-rose-500/20 to-red-600/10",
    lessons: [
      {
        id: "situations-1",
        title: "Scenarios & Escalation",
        description: "Real situations you'll face and the right response to each.",
        estimatedMins: 4,
        sections: [
          {
            type: "heading",
            text: "Rude Guest During Your Event",
          },
          {
            type: "list",
            items: [
              "Stay calm — don't respond emotionally",
              "Redirect: \"Let's keep things positive for everyone\"",
              "Still going? Contact a senior privately — don't make it public",
            ],
          },
          {
            type: "heading",
            text: "Teammate Asks You to Log Their Interaction",
          },
          {
            type: "callout",
            variant: "danger",
            title: "Always Decline",
            text: "Only log what you personally conducted. No exceptions — regardless of intent.",
          },
          {
            type: "heading",
            text: "Guest Complains About a Staff Member",
          },
          {
            type: "list",
            items: [
              "Listen professionally, take it seriously",
              "Don't dismiss it or take sides publicly",
              "Pass it to your senior with the details",
              "Do not confront the staff member yourself",
            ],
          },
          {
            type: "heading",
            text: "When to Escalate",
          },
          {
            type: "checklist",
            items: [
              "Behaviour is seriously disruptive and not responding to redirection",
              "A complaint involves another staff member's conduct",
              "You're being pressured to do something against the rules",
              "The situation is beyond your rank to resolve",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            title: "Escalating Is Correct",
            text: "Asking for help shows good judgement — not weakness. Handle what's in your role. Escalate the rest.",
          },
        ],
      },
    ],
  },

  {
    id: "growth",
    title: "Activity & Growth",
    description: "How to stay active and progress through the team.",
    icon: "🚀",
    gradient: "from-pink-500/20 to-fuchsia-600/10",
    lessons: [
      {
        id: "growth-1",
        title: "Progressing in the Team",
        description: "What earns rank and what holds you back.",
        estimatedMins: 3,
        sections: [
          {
            type: "heading",
            text: "What Gets You Promoted",
          },
          {
            type: "checklist",
            items: [
              "Consistent, quality interaction logging",
              "Reliable slot coverage — showing up every time",
              "Clean conduct — no warnings or incidents",
              "Taking initiative without being asked",
              "Positive feedback from guests and teammates",
            ],
          },
          {
            type: "heading",
            text: "What Holds You Back",
          },
          {
            type: "list",
            items: [
              "Going hard for two weeks, then disappearing",
              "Conduct issues or repeated warnings",
              "Poor communication with your chain of command",
              "Doing the bare minimum to avoid removal",
            ],
          },
          {
            type: "callout",
            variant: "info",
            title: "The Real Key",
            text: "The fastest-progressing staff aren't the highest scorers. They're the most consistent, the most reliable, and the most genuinely invested in the team's success.",
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
    question: "True or False: Logging interactions is optional if you feel the session wasn't notable.",
    options: ["True", "False"],
    correct: 1,
    explanation: "Every qualifying interaction during every active session must be logged. It is not optional.",
  },
  {
    id: "q3",
    type: "mc",
    question: "Which of the following does NOT count as a valid interaction?",
    options: [
      "Hosting a trivia night for a group of guests",
      "Personally welcoming and engaging a new guest",
      "Walking past a guest and saying 'hey'",
      "Organising a mini-game that multiple guests joined",
    ],
    correct: 2,
    explanation: "Brief, transactional acknowledgements don't qualify. A valid interaction adds real value to the guest's experience.",
  },
  {
    id: "q4",
    type: "scenario",
    question: "During your event, a guest starts making rude comments that disrupt the atmosphere. What is the correct first step?",
    options: [
      "Immediately end the event",
      "Publicly call them out in front of everyone",
      "Stay calm, redirect professionally, and involve a senior if it continues",
      "Ignore them and hope they stop",
    ],
    correct: 2,
    explanation: "Stay composed, redirect the situation professionally, and escalate to a senior if the behaviour continues. Never retaliate or end the event prematurely.",
  },
  {
    id: "q5",
    type: "tf",
    question: "True or False: Missing a scheduled slot without notice is acceptable as long as it's infrequent.",
    options: ["True", "False"],
    correct: 1,
    explanation: "No-shows without notice are never acceptable. Always notify your chain of command as early as possible.",
  },
  {
    id: "q6",
    type: "mc",
    question: "What does 'quality over quantity' mean for interactions?",
    options: [
      "Log as many as possible each session to top the leaderboard",
      "Focus only on VIP or high-spending guests",
      "Each interaction should be meaningful and add genuine value",
      "Complete interactions quickly to log more",
    ],
    correct: 2,
    explanation: "A smaller number of genuinely excellent interactions is worth far more than a high count of shallow ones.",
  },
  {
    id: "q7",
    type: "mc",
    question: "What is the correct escalation path when a situation is beyond your ability to handle?",
    options: [
      "Handle it regardless of how difficult it gets",
      "Post about it in a public in-game channel",
      "Quietly ignore it and move on",
      "Contact your direct senior first, then go higher if unavailable",
    ],
    correct: 3,
    explanation: "Always start with your direct senior. If unavailable, move one rank higher. Keep escalation private and factual.",
  },
  {
    id: "q8",
    type: "tf",
    question: "True or False: New staff are expected to resolve all situations independently without guidance.",
    options: ["True", "False"],
    correct: 1,
    explanation: "Knowing when to ask for guidance is a sign of good judgement. New staff should absolutely seek help when needed.",
  },
  {
    id: "q9",
    type: "scenario",
    question: "A fellow staff member asks you to log an interaction on their behalf that you didn't witness. What do you do?",
    options: [
      "Log it to help them out — it's a team effort",
      "Log it but add a note that it was on their behalf",
      "Decline — only log interactions you personally conducted",
      "Log it and report the staff member afterwards",
    ],
    correct: 2,
    explanation: "Only log interactions you personally conducted. Logging on behalf of others compromises the integrity of the system.",
  },
  {
    id: "q10",
    type: "mc",
    question: "Which best describes professional conduct during an in-game session?",
    options: [
      "Using casual language and slang to seem relatable",
      "Remaining respectful, approachable, and helpful at all times",
      "Only engaging with guests who approach you first",
      "Focusing on personal RP when guests aren't around",
    ],
    correct: 1,
    explanation: "Professional conduct means being actively engaged, respectful, and guest-focused throughout your entire session.",
  },
  {
    id: "q11",
    type: "tf",
    question: "True or False: Staff may discuss internal team decisions publicly in-game.",
    options: ["True", "False"],
    correct: 1,
    explanation: "Internal communications are confidential. Discussing team decisions or disciplinary matters publicly is a conduct violation.",
  },
  {
    id: "q12",
    type: "scenario",
    question: "You spot an uncovered slot on the schedule. What's the correct action?",
    options: [
      "Ignore it — not your responsibility",
      "Book yourself in immediately without checking",
      "Tell a senior and offer to cover if you're available",
      "Cancel adjacent slots so the gap isn't obvious",
    ],
    correct: 2,
    explanation: "Notify a senior and offer to help. Don't self-book without management awareness — always communicate first.",
  },
  {
    id: "q13",
    type: "mc",
    question: "How should you handle a guest who is new and unfamiliar with how things work?",
    options: [
      "Point them to a FAQ and move on",
      "Assume they'll figure it out",
      "Alert management to deal with them",
      "Patiently guide them, make them feel welcome, and offer help",
    ],
    correct: 3,
    explanation: "New guests are exactly who we're here to serve. A warm welcome turns a confused first visit into a reason to return.",
  },
  {
    id: "q14",
    type: "tf",
    question: "True or False: The leaderboard interaction count is the only metric management uses to evaluate staff.",
    options: ["True", "False"],
    correct: 1,
    explanation: "The leaderboard is one indicator. Quality, reliability, conduct, and teamwork all factor into performance reviews.",
  },
  {
    id: "q15",
    type: "scenario",
    question: "You have a new event format idea you want to try on your next slot. What's the right approach?",
    options: [
      "Run it immediately — initiative is encouraged",
      "Discuss it with your senior or manager for approval first",
      "Post it publicly for guest feedback before clearing internally",
      "Try it once, then mention it if something goes wrong",
    ],
    correct: 1,
    explanation: "New ideas are encouraged, but must be cleared with management first to ensure they meet team standards.",
  },
  {
    id: "q16",
    type: "mc",
    question: "A guest complains to you about another staff member. What do you do?",
    options: [
      "Dismiss it — guests are often just frustrated",
      "Publicly address the staff member in front of the guest",
      "Listen, acknowledge the concern, and escalate to your senior",
      "Handle the complaint yourself to avoid involving management",
    ],
    correct: 2,
    explanation: "Always listen, take it seriously, and pass it up the chain with the details. Don't dismiss it or handle it yourself.",
  },
  {
    id: "q17",
    type: "mc",
    question: "Which best describes what earns rank progression at KNG?",
    options: [
      "Length of time on the team",
      "Having the highest interaction count",
      "Consistent performance, clean conduct, reliability, and initiative",
      "Being on good terms with senior management",
    ],
    correct: 2,
    explanation: "Progression is earned through demonstrated performance across consistency, conduct, reliability, and leadership — not just numbers.",
  },
  {
    id: "q18",
    type: "mc",
    question: "What is the correct rank order from lowest to highest?",
    options: [
      "Helper → SLD → LD → AUX → Member → ADM → Manager",
      "Member → Helper → SLD → LD → AUX → ADM → Manager",
      "Helper / Member → SLD → LD → AUX → ADM → Manager",
      "SLD → Helper → Member → LD → AUX → Manager → ADM",
    ],
    correct: 2,
    explanation: "Helper and Member are both entry level (rank 1), followed by SLD, LD, AUX, ADM, and Manager at the top.",
  },
];

export const PASSING_SCORE = 0.8;
