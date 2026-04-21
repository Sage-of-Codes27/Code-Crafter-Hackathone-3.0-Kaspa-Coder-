const STORAGE_KEY      = "smart-budget-allocation-data";
const CHAT_STORAGE_KEY = "smart-budget-chat-history";

class SmartBudgetApp {
    constructor() {
        this.state = {
            income: 0,
            expenses: []
        };
        this.chatHistory = [];
        this.chatContext = {
            lastIntent: null,
            lastAmount: null,
            lastRate: null,
            lastMonths: null,
            lastQuestion: null
        };
        this.dailyTips = [
            "💡 Pay yourself first — auto-transfer savings on salary day before any spending.",
            "💡 Track every expense for 30 days. You'll spot leaks you didn't know existed.",
            "💡 Wait 24 hours before any purchase over Rs 5,000. Most impulses fade.",
            "💡 Cancel one subscription you used less than twice this month.",
            "💡 Round up every UPI payment to the next Rs 100 and stash the diff into savings.",
            "💡 Negotiate yearly bills (insurance, internet, gym) — most providers will discount to retain you.",
            "💡 Use the 50/30/20 rule as a starting point, then tweak to your reality.",
            "💡 Index funds beat 80%+ of active funds over 10+ years — and cost less.",
            "💡 Inflation in India averages ~6%. Any 'safe' return below that is a slow loss.",
            "💡 Clear high-interest debt before investing — paying off 18% debt = guaranteed 18% return.",
            "💡 Increase your SIP by your salary hike % every year. Wealth compounds quietly.",
            "💡 Keep emergency fund in liquid funds or sweep-in FD — earns more than savings account."
        ];
        this.moneyFacts = [
            "📚 Rs 10,000 invested monthly at 12% becomes ~₹1 crore in 20 years.",
            "📚 The Rule of 72: divide 72 by your return rate to know how many years to double your money.",
            "📚 Warren Buffett earned 99% of his wealth after age 50 — compounding is patient.",
            "📚 Indians on average save ~30% of income — among the highest in the world.",
            "📚 Credit card interest is usually 36–42% per year — the most expensive debt you can have.",
            "📚 PPF interest is fully tax-free in India and currently around 7.1%.",
            "📚 EPF gives ~8.25% tax-free — one of the best 'safe' returns available.",
            "📚 SIPs in equity mutual funds have given ~12% average returns over 20+ years."
        ];
        this.jokes = [
            "😄 Why don't economists ever get lost? They always follow the money.",
            "😄 My wallet is like an onion — every time I open it, I cry.",
            "😄 What's the fastest way to double your money? Fold it in half.",
            "😄 I'm so broke I can't even pay attention.",
            "😄 Money talks, but all mine ever says is 'goodbye'."
        ];
        this.currencyFormatter = new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        });
        this.chartColors = ["#2f73ff", "#18a76e", "#0f9fb5", "#ff8b6b", "#6b77ff", "#f0b429"];
        this.expenseGroups = {
            Food: "needs",
            Rent: "needs",
            Transport: "needs",
            Utilities: "needs",
            Entertainment: "wants",
            Other: "wants"
        };
        this.toastTimeout = null;
        this.cacheElements();
        this.bindEvents();
        this.loadState();
        this.renderAll();
    }

    cacheElements() {
        this.elements = {
            incomeForm: document.getElementById("incomeForm"),
            incomeInput: document.getElementById("incomeInput"),
            incomeValue: document.getElementById("incomeValue"),
            expenseForm: document.getElementById("expenseForm"),
            expenseCategory: document.getElementById("expenseCategory"),
            expenseAmount: document.getElementById("expenseAmount"),
            expenseList: document.getElementById("expenseList"),
            expenseCount: document.getElementById("expenseCount"),
            analyzeBudgetBtn: document.getElementById("analyzeBudgetBtn"),
            allocationComparison: document.getElementById("allocationComparison"),
            suggestionsList: document.getElementById("suggestionsList"),
            scoreValue: document.getElementById("scoreValue"),
            scoreStatus: document.getElementById("scoreStatus"),
            scoreRing: document.querySelector(".score-ring"),
            needsActual: document.getElementById("needsActual"),
            wantsActual: document.getElementById("wantsActual"),
            savingsActual: document.getElementById("savingsActual"),
            heroIncome: document.getElementById("heroIncome"),
            heroExpenses: document.getElementById("heroExpenses"),
            heroBalance: document.getElementById("heroBalance"),
            statIncome: document.getElementById("statIncome"),
            statExpenses: document.getElementById("statExpenses"),
            statBalance: document.getElementById("statBalance"),
            statSavingsRate: document.getElementById("statSavingsRate"),
            savingsProgressLabel: document.getElementById("savingsProgressLabel"),
            savingsProgressBar: document.getElementById("savingsProgressBar"),
            monthlySavings: document.getElementById("monthlySavings"),
            yearlySavings: document.getElementById("yearlySavings"),
            fiveYearSavings: document.getElementById("fiveYearSavings"),
            goalForm: document.getElementById("goalForm"),
            goalAmount: document.getElementById("goalAmount"),
            goalMonths: document.getElementById("goalMonths"),
            goalResult: document.getElementById("goalResult"),
            chatForm: document.getElementById("chatForm"),
            chatQuestion: document.getElementById("chatQuestion"),
            chatMessages: document.getElementById("chatMessages"),
            clearChatBtn: document.getElementById("clearChatBtn"),
            toast: document.getElementById("toast"),
            expenseChart: document.getElementById("expenseChart")
        };
    }

    bindEvents() {
        this.elements.incomeForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.saveIncome();
        });

        this.elements.expenseForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.addExpense();
        });

        this.elements.expenseList.addEventListener("click", (event) => {
            const deleteButton = event.target.closest("[data-delete-id]");
            if (!deleteButton) {
                return;
            }

            this.deleteExpense(Number(deleteButton.dataset.deleteId));
        });

        this.elements.analyzeBudgetBtn.addEventListener("click", () => {
            this.renderAll();
            this.showToast("Budget analysis refreshed.", "info");
        });

        this.elements.goalForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.calculateGoalPlan();
        });

        this.elements.chatForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.handleChatQuestion();
        });

        if (this.elements.clearChatBtn) {
            this.elements.clearChatBtn.addEventListener("click", () => {
                this.clearChat();
            });
        }
    }

    loadState() {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (!savedState) {
            this.loadChatHistory();
            return;
        }

        try {
            const parsed = JSON.parse(savedState);
            this.state.income = Number(parsed.income) || 0;
            this.state.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
        } catch (error) {
            console.error("Unable to load saved budget data.", error);
        }

        this.loadChatHistory();
    }

    saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    saveIncome() {
        const income = Number(this.elements.incomeInput.value);

        if (!Number.isFinite(income) || income <= 0) {
            this.showToast("Enter a valid monthly income.", "warning");
            return;
        }

        this.state.income = income;
        this.saveState();
        this.renderAll();
        this.showToast("Monthly income saved.", "success");
    }

    addExpense() {
        const category = this.elements.expenseCategory.value;
        const amount = Number(this.elements.expenseAmount.value);

        if (!category) {
            this.showToast("Select an expense category.", "warning");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            this.showToast("Enter a valid expense amount.", "warning");
            return;
        }

        this.state.expenses.unshift({
            id: Date.now(),
            category,
            amount
        });

        this.saveState();
        this.elements.expenseForm.reset();
        this.renderAll();
        this.showToast("Expense added.", "success");
    }

    deleteExpense(id) {
        this.state.expenses = this.state.expenses.filter((expense) => expense.id !== id);
        this.saveState();
        this.renderAll();
        this.showToast("Expense removed.", "info");
    }

    calculateSummary() {
        const income = this.state.income;
        const totalExpenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remainingBalance = income - totalExpenses;
        const categoryTotals = {
            Food: 0,
            Rent: 0,
            Transport: 0,
            Entertainment: 0,
            Utilities: 0,
            Other: 0
        };

        this.state.expenses.forEach((expense) => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const needsAmount = ["Food", "Rent", "Transport", "Utilities"].reduce(
            (sum, category) => sum + (categoryTotals[category] || 0),
            0
        );
        const wantsAmount = ["Entertainment", "Other"].reduce(
            (sum, category) => sum + (categoryTotals[category] || 0),
            0
        );
        const savingsAmount = Math.max(remainingBalance, 0);

        const getRate = (amount) => (income > 0 ? (amount / income) * 100 : 0);

        const needsRate = getRate(needsAmount);
        const wantsRate = getRate(wantsAmount);
        const savingsRate = getRate(savingsAmount);
        const totalExpenseRate = getRate(totalExpenses);

        const categoryPercentages = Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount,
            percentage: getRate(amount)
        }));

        return {
            income,
            totalExpenses,
            remainingBalance,
            categoryTotals,
            categoryPercentages,
            needsAmount,
            wantsAmount,
            savingsAmount,
            needsRate,
            wantsRate,
            savingsRate,
            totalExpenseRate,
            idealNeeds: income * 0.5,
            idealWants: income * 0.3,
            idealSavings: income * 0.2
        };
    }

    generateSuggestions(summary) {
        const suggestions = [];

        if (summary.income <= 0) {
            suggestions.push("Add your monthly income first so the assistant can compare your spending against a realistic budget.");
            return suggestions;
        }

        if (summary.savingsRate < 20) {
            suggestions.push(
                `Your savings rate is ${this.formatPercent(summary.savingsRate)}. Try moving at least ${this.formatCurrency(summary.idealSavings - summary.savingsAmount)} more into savings each month to reach the 20% goal.`
            );
        }

        if (summary.categoryTotals.Food > summary.income * 0.3) {
            suggestions.push("Food spending is above 30% of income. Consider meal planning, bulk buying, or trimming restaurant spending.");
        }

        if (summary.categoryTotals.Rent > summary.income * 0.4) {
            suggestions.push("Rent is above 40% of income. This is a pressure point and may limit your flexibility for savings and emergencies.");
        }

        if (summary.wantsAmount > summary.needsAmount) {
            suggestions.push("Your wants spending is higher than your needs spending. Review entertainment and discretionary purchases before the next month starts.");
        }

        if (summary.remainingBalance < 0) {
            suggestions.push("You are spending more than you earn this month. Reduce discretionary categories immediately to avoid rolling debt forward.");
        }

        if (!suggestions.length) {
            suggestions.push("Your budget is in a healthy range. Keep protecting your savings and review large recurring costs once a month.");
        }

        return suggestions;
    }

    calculateHealthScore(summary) {
        if (summary.income <= 0) {
            return { score: 0, status: "Poor", tone: "#d9534f" };
        }

        let score = 100;

        if (summary.savingsRate < 20) {
            score -= Math.min(30, Math.round((20 - summary.savingsRate) * 1.5));
        }

        if (summary.totalExpenseRate > 80) {
            score -= Math.min(25, Math.round((summary.totalExpenseRate - 80) * 1.2));
        }

        if (summary.wantsRate > 30) {
            score -= Math.min(15, Math.round((summary.wantsRate - 30) * 0.8));
        }

        if (summary.categoryTotals.Rent > summary.income * 0.4) {
            score -= 12;
        }

        if (summary.categoryTotals.Food > summary.income * 0.3) {
            score -= 8;
        }

        if (summary.remainingBalance < 0) {
            score -= 20;
        }

        score = Math.max(0, Math.min(100, Math.round(score)));

        if (score >= 75) {
            return { score, status: "Good", tone: "#18a76e" };
        }

        if (score >= 50) {
            return { score, status: "Moderate", tone: "#f0b429" };
        }

        return { score, status: "Poor", tone: "#d9534f" };
    }

    getCategoryEmoji(category) {
        const map = {
            Food: "🍛",
            Rent: "🏠",
            Transport: "🚌",
            Utilities: "💡",
            Entertainment: "🎬",
            Other: "📦"
        };
        return map[category] || "💸";
    }

    renderExpenseList() {
        if (!this.state.expenses.length) {
            this.elements.expenseList.innerHTML = `
                <div class="empty-state">
                    📭 No expenses added yet.<br>Use the form on the left to add your first expense!
                </div>
            `;
            this.elements.expenseCount.textContent = "0 items";
            return;
        }

        this.elements.expenseCount.textContent = `${this.state.expenses.length} item${this.state.expenses.length === 1 ? "" : "s"}`;
        this.elements.expenseList.innerHTML = this.state.expenses
            .map(
                (expense) => `
                    <article class="expense-item">
                        <span class="expense-item__emoji">${this.getCategoryEmoji(expense.category)}</span>
                        <div class="expense-item__info">
                            <p class="expense-item__title">${expense.category}</p>
                            <div class="expense-item__meta">${this.expenseGroups[expense.category] === "needs" ? "✅ Need" : "🎯 Want"} category</div>
                        </div>
                        <span class="expense-item__amount">${this.formatCurrency(expense.amount)}</span>
                        <button class="delete-button" type="button" data-delete-id="${expense.id}">🗑 Remove</button>
                    </article>
                `
            )
            .join("");
    }

    renderSummary(summary) {
        const savingsProgress = summary.income > 0 ? Math.min((summary.savingsRate / 20) * 100, 100) : 0;

        this.elements.incomeInput.value = summary.income > 0 ? summary.income : "";
        this.elements.incomeValue.textContent = this.formatCurrency(summary.income);
        this.elements.heroIncome.textContent = this.formatCurrency(summary.income);
        this.elements.heroExpenses.textContent = this.formatCurrency(summary.totalExpenses);
        this.elements.heroBalance.textContent = this.formatCurrency(summary.remainingBalance);
        this.elements.statIncome.textContent = this.formatCurrency(summary.income);
        this.elements.statExpenses.textContent = this.formatCurrency(summary.totalExpenses);
        this.elements.statBalance.textContent = this.formatCurrency(summary.remainingBalance);
        this.elements.statSavingsRate.textContent = this.formatPercent(summary.savingsRate);
        this.elements.savingsProgressLabel.textContent = `${this.formatPercent(summary.savingsRate)} of 20% goal`;
        this.elements.savingsProgressBar.style.width = `${savingsProgress}%`;
        this.elements.statBalance.style.color = summary.remainingBalance >= 0 ? "#18a76e" : "#d9534f";
        this.elements.heroBalance.style.color = summary.remainingBalance >= 0 ? "#18a76e" : "#d9534f";
    }

    renderAllocation(summary) {
        if (summary.income <= 0) {
            this.elements.allocationComparison.innerHTML = `
                <div class="empty-state">
                    Save your monthly income to compare your actual needs, wants, and savings against the 50/30/20 rule.
                </div>
            `;
            return;
        }

        const rows = [
            {
                label: "Needs",
                actualAmount: summary.needsAmount,
                actualRate: summary.needsRate,
                idealAmount: summary.idealNeeds,
                idealRate: 50,
                className: "allocation-fill--needs"
            },
            {
                label: "Wants",
                actualAmount: summary.wantsAmount,
                actualRate: summary.wantsRate,
                idealAmount: summary.idealWants,
                idealRate: 30,
                className: "allocation-fill--wants"
            },
            {
                label: "Savings",
                actualAmount: summary.savingsAmount,
                actualRate: summary.savingsRate,
                idealAmount: summary.idealSavings,
                idealRate: 20,
                className: "allocation-fill--savings"
            }
        ];

        this.elements.allocationComparison.innerHTML = rows
            .map(
                (row) => `
                    <div class="allocation-card">
                        <div class="allocation-top">
                            <div class="allocation-copy">
                                <strong>${row.label}</strong>
                                <span>Ideal: ${row.idealRate}% (${this.formatCurrency(row.idealAmount)})</span>
                            </div>
                            <div class="allocation-values">
                                <strong>${this.formatPercent(row.actualRate)}</strong>
                                <span>Actual: ${this.formatCurrency(row.actualAmount)}</span>
                            </div>
                        </div>
                        <div class="allocation-bar">
                            <div class="allocation-fill ${row.className}" style="width: ${Math.min(row.actualRate, 100)}%"></div>
                        </div>
                    </div>
                `
            )
            .join("");
    }

    renderSuggestions(summary) {
        const suggestions = this.generateSuggestions(summary);
        this.elements.suggestionsList.innerHTML = suggestions
            .map((suggestion) => `<li>${suggestion}</li>`)
            .join("");
    }

    renderScore(summary) {
        const health = this.calculateHealthScore(summary);
        const degrees = Math.round((health.score / 100) * 360);

        this.elements.scoreValue.textContent = String(health.score);
        this.elements.scoreStatus.textContent =
            summary.income > 0
                ? `${health.status} budget health based on savings, needs, and spending pressure.`
                : "Set your income to generate a score.";
        this.elements.scoreRing.style.background = `
            radial-gradient(closest-side, var(--card-bg) 72%, transparent 73% 100%),
            conic-gradient(${health.tone} ${degrees}deg, rgba(16, 35, 63, 0.12) 0deg)
        `;
        this.elements.needsActual.textContent = this.formatPercent(summary.needsRate);
        this.elements.wantsActual.textContent = this.formatPercent(summary.wantsRate);
        this.elements.savingsActual.textContent = this.formatPercent(summary.savingsRate);
    }

    renderForecast(summary) {
        this.elements.monthlySavings.textContent = this.formatCurrency(summary.remainingBalance);
        this.elements.yearlySavings.textContent = this.formatCurrency(summary.remainingBalance * 12);
        this.elements.fiveYearSavings.textContent = this.formatCurrency(summary.remainingBalance * 60);
    }

    renderChart(summary) {
        const canvas = this.elements.expenseChart;
        const context = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        context.clearRect(0, 0, width, height);

        const activeCategories = summary.categoryPercentages.filter((entry) => entry.amount > 0);
        if (!activeCategories.length) {
            context.fillStyle = "#5f738f";
            context.font = "16px Manrope";
            context.fillText("Add expenses to view your category chart.", 24, height / 2);
            return;
        }

        const padding = 36;
        const chartHeight = height - padding * 2 - 36;
        const chartWidth = width - padding * 2;
        const barGap = 18;
        const barWidth = (chartWidth - barGap * (activeCategories.length - 1)) / activeCategories.length;
        const maxAmount = Math.max(...activeCategories.map((entry) => entry.amount), 1);

        context.strokeStyle = "rgba(16, 35, 63, 0.12)";
        context.lineWidth = 1;

        for (let step = 0; step <= 4; step += 1) {
            const y = padding + (chartHeight / 4) * step;
            context.beginPath();
            context.moveTo(padding, y);
            context.lineTo(width - padding, y);
            context.stroke();
        }

        activeCategories.forEach((entry, index) => {
            const barHeight = (entry.amount / maxAmount) * chartHeight;
            const x = padding + index * (barWidth + barGap);
            const y = padding + chartHeight - barHeight;

            context.fillStyle = this.chartColors[index % this.chartColors.length];
            this.drawRoundedRect(context, x, y, barWidth, barHeight, 16);
            context.fill();

            context.fillStyle = "#10233f";
            context.font = "12px Manrope";
            context.textAlign = "center";
            context.fillText(entry.category, x + barWidth / 2, height - 18);
            context.fillText(this.formatPercent(entry.percentage), x + barWidth / 2, y - 10);
        });
    }

    drawRoundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height);
        context.lineTo(x, y + height);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    calculateGoalPlan() {
        const goalAmount = Number(this.elements.goalAmount.value);
        const goalMonths = Number(this.elements.goalMonths.value);
        const summary = this.calculateSummary();

        if (!Number.isFinite(goalAmount) || goalAmount <= 0 || !Number.isFinite(goalMonths) || goalMonths <= 0) {
            this.showToast("Enter a valid goal amount and timeframe.", "warning");
            return;
        }

        const requiredMonthlySaving = goalAmount / goalMonths;
        const currentMonthlySaving = Math.max(summary.remainingBalance, 0);
        const difference = currentMonthlySaving - requiredMonthlySaving;

        let guidance = "You need to increase your monthly savings to hit this target.";
        if (difference >= 0) {
            guidance = "You are currently on pace for this goal if you stay consistent.";
        }

        this.elements.goalResult.className = "goal-result-box goal-output--success";
        this.elements.goalResult.innerHTML = `
            <span class="goal-output__meta">💰 Required monthly saving to hit your goal</span>
            <strong>${this.formatCurrency(requiredMonthlySaving)}</strong>
            <div>Your current monthly saving: ${this.formatCurrency(currentMonthlySaving)}</div>
            <div style="margin-top:8px">${difference >= 0 ? "✅" : "⚠️"} ${guidance}</div>
        `;
    }

    // ─── INDIAN AMOUNT PARSER ────────────────────────────────────────────────
    parseIndianAmount(rawText) {
        let text = rawText.toLowerCase()
            .replace(/,/g, " ")
            .replace(/rs\.?\s*/g, "")
            .replace(/₹/g, "")
            .trim();

        const wordMap = {
            zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
            eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
            sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
            twenty: 20, thirty: 30, forty: 40, fifty: 50,
            sixty: 60, seventy: 70, eighty: 80, ninety: 90
        };

        for (const [word, num] of Object.entries(wordMap)) {
            text = text.replace(new RegExp("\\b" + word + "\\b", "g"), " " + num + " ");
        }
        text = text.replace(/\s+/g, " ").trim();

        let total = 0;
        let found = false;

        const croreMatch = text.match(/(\d+(?:\.\d+)?)\s*crore[s]?/);
        if (croreMatch) { total += parseFloat(croreMatch[1]) * 10000000; found = true; }

        const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh[s]?|lac[s]?)/);
        if (lakhMatch) { total += parseFloat(lakhMatch[1]) * 100000; found = true; }

        const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:thousand[s]?|\bk\b)/);
        if (thousandMatch) { total += parseFloat(thousandMatch[1]) * 1000; found = true; }

        if (!found) {
            const plain = text.match(/\b(\d+(?:\.\d+)?)\b/);
            if (plain) { total = parseFloat(plain[1]); found = true; }
        }

        return found ? total : null;
    }

    // ─── FUZZY INTENT MATCHER ────────────────────────────────────────────────
    matchesIntent(text, keywords) {
        const t = text.toLowerCase();
        return keywords.some(kw => t.includes(kw));
    }

    // ─── INTENT KEYWORD LISTS ────────────────────────────────────────────────
    get intents() {
        return {
            greeting: [
                "hi ", "hello", "hey ", "helo", "hii", "hiii", "hey!", "namaste",
                "good morning", "good evening", "good afternoon", "howdy", "sup "
            ],
            thanks: [
                "thank", "thnk", "thnx", "thx", "ty ", "great job", "nice one",
                "helpful", "awesome", "perfect", "well done", "good bot", "nice bot"
            ],
            help: [
                "help", " hlp", "what can you", "what can i ask", "what do you do",
                "how to use", "guide me", "options", "commands", "topics", "what can you tell"
            ],
            clear_chat: [
                "clear chat", "delete chat", "reset chat", "new chat", "erase chat", "wipe chat"
            ],
            rule_5030: [
                "50 30 20", "50/30/20", "fifty thirty twenty", "50-30-20",
                "what is the rule", "budget rule", "explain rule", "503020"
            ],
            emergency: [
                "emergency fund", "emergenci", "emergency", "rainy day",
                "safety net", "backup money", "emergency saving", "financial safety"
            ],
            invest: [
                "invest", "investmen", "mutual fund", "mf ", "fd ", "fixed deposit",
                "stock", "nifty", "sensex", "sip ", "returns", "equity", "ppf", "nps"
            ],
            health_score: [
                "score", "health score", "budget score", "budget health", "how healthy",
                "rating", "how good is", "my rating", "budget grade", "grade"
            ],
            forecast: [
                "forecast", "future saving", "projection", "5 year", "5year",
                "yearly saving", "annual saving", "1 year", "how much will i save"
            ],
            balance: [
                "balance", "balanc", "balnce", "balence", "how much left",
                "remaining", "how much do i have", "available money", "what do i have",
                "how much money", "leftover", "what is left"
            ],
            income_query: [
                "my income", "my salary", "my earning", "how much i earn",
                "salary info", "income info", "what is my income", "what is my salary"
            ],
            savings_status: [
                "my savings", "how much saved", "saving rate", "saveing rate",
                "savign rate", "savng", "savings status", "how much saving",
                "am i saving", "savings percent", "savigs"
            ],
            save_more: [
                "how to save more", "save more", "increase saving", "improve saving",
                "tips to save", "ways to save", "how can i save", "want to save more",
                "boost saving", "help me save"
            ],
            afford_buy: [
                "afford", "affor", "aford", "affrd", "affored",
                "can i buy", "can i get", "can i purchase", "want to buy",
                "should i buy", "should i get", "is it ok to buy",
                "can i take", "purchase", "purchse", "able to buy", "buy a "
            ],
            food_query: [
                "food spending", "food expense", "my food", "groceri", "grocery",
                "groceries", "how much on food", "food cost", "meal cost", "eating cost"
            ],
            rent_query: [
                "rent spending", "my rent", "rent expense", "house rent",
                "rent cost", "accommodation", "housing cost", "how much rent"
            ],
            transport_query: [
                "transport", "transprt", "travel cost", "commute", "petrol cost",
                "fuel cost", "auto fare", "bus fare", "train cost", "travel expense"
            ],
            utilities_query: [
                "utilities", "electric bill", "electricity", "water bill",
                "internet bill", "phone bill", "bills cost", "utility bill"
            ],
            entertainment_query: [
                "entertainment", "entertaiment", "movie spend", "games spend",
                "netflix", "subscription cost", "fun money", "leisure"
            ],
            budget_status: [
                "how is my budget", "budget status", "budget check", "how am i doing",
                "am i ok", "how i am doing", "budget overview", "budgt", "budge",
                "spending status", "overall budget", "show my budget"
            ],
            overspending: [
                "overspend", "over budget", "spending too much", "too many expense",
                "debt", "negative balance", "more than earn", "exceed"
            ],
            reduce_expenses: [
                "reduce expense", "cut expense", "lower expense", "reduce spending",
                "cut spending", "save on", "spend less", "trim expense", "cut cost"
            ],
            goal_query: [
                "goal", "gol ", "my goal", "target", "tarrget", "milestone",
                "planning for", "save for", "saving for", "dream"
            ],
            emi_calc: [
                "emi", "e.m.i", "equated monthly", "monthly installment",
                "monthly instalment", "installment for", "instalment for"
            ],
            loan_calc: [
                "loan", "lone ", "borrow", "home loan", "car loan", "personal loan",
                "education loan", "bike loan", "house loan", "loan calc"
            ],
            sip_calc: [
                "sip", "s.i.p", "systematic investment", "monthly invest",
                "mutual fund return", "sip return", "sip calc"
            ],
            fd_calc: [
                "fd ", "fixed deposit", "f.d", "rd ", "recurring deposit",
                "fd calc", "deposit return", "fd return"
            ],
            retirement: [
                "retire", "retirement", "pension", "old age", "after 60",
                "post retirement", "retirement plan", "retirement corpus"
            ],
            inflation: [
                "inflation", "inflasion", "price rise", "value of money",
                "real value", "purchasing power", "future value", "today's value"
            ],
            debt_payoff: [
                "debt", "credit card debt", "loan payoff", "pay off", "payoff",
                "debt free", "clear debt", "credit card bill", "cc debt",
                "snowball", "avalanche"
            ],
            financial_freedom: [
                "financial freedom", "fire ", "financial independence",
                "freedom number", "passive income", "f.i.r.e", "retire early"
            ],
            tax_basic: [
                "tax", "income tax", "tds", "old regime", "new regime",
                "80c", "tax saving", "tax slab"
            ],
            credit_score: [
                "credit score", "cibil", "credit rating", "credit report"
            ],
            motivation: [
                "motivat", "feeling low", "give up", "depressed about money",
                "stressed", "tired of", "money stress", "encourage"
            ],
            rule_of_72: [
                "rule of 72", "rule 72", "double my money", "doubling time",
                "how long to double", "when will my money double"
            ],
            ppf: [
                "ppf", "public provident fund", "p.p.f"
            ],
            epf: [
                "epf", "employee provident fund", "e.p.f", "pf account"
            ],
            nps: [
                "nps", "national pension"
            ],
            prepayment: [
                "prepay", "pre pay", "pre-pay", "loan prepayment", "part payment",
                "partial payment", "extra payment loan", "foreclose", "close loan early"
            ],
            take_home: [
                "take home", "in hand salary", "in-hand", "ctc", "net salary",
                "gross to net", "salary breakup"
            ],
            rent_vs_buy: [
                "rent vs buy", "buy vs rent", "should i buy a house", "should i buy home",
                "rent or buy", "buy a flat", "purchase a house"
            ],
            salary_hike: [
                "salary hike", "salary increase", "got a raise", "got hike",
                "appraisal", "what to do with hike", "got promotion"
            ],
            compound: [
                "compound interest", "compounding", "ci calc"
            ],
            step_up_sip: [
                "step up sip", "step-up sip", "stepup sip", "increasing sip", "annual increase sip"
            ],
            goal_sip: [
                "how much sip", "sip needed", "sip for", "sip to reach",
                "monthly sip needed", "sip required"
            ],
            joke: [
                "joke", "make me laugh", "tell me a joke", "funny", "humor"
            ],
            fact: [
                "fact", "money fact", "tell me something", "interesting fact",
                "did you know", "trivia"
            ],
            tip_of_day: [
                "tip", "daily tip", "tip of day", "tip of the day", "give me a tip",
                "advice", "money advice", "give me advice"
            ],
            who_are_you: [
                "who are you", "what are you", "your name", "about you", "about yourself"
            ],
            yes_followup: [
                "yes please", "yes do", "ok yes", "go ahead", "show me", "tell me more",
                "more details", "continue", "elaborate"
            ]
        };
    }

    // ─── BEST-MATCH INTENT SCORING ───────────────────────────────────────────
    rankIntent(text) {
        const t = text.toLowerCase();
        let best = { name: null, score: 0 };
        for (const [name, kws] of Object.entries(this.intents)) {
            for (const kw of kws) {
                if (t.includes(kw)) {
                    const s = kw.length;
                    if (s > best.score) best = { name, score: s };
                }
            }
        }
        return best;
    }

    // Levenshtein for short typo correction
    levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const m = [];
        for (let i = 0; i <= b.length; i++) m[i] = [i];
        for (let j = 0; j <= a.length; j++) m[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                    ? m[i - 1][j - 1]
                    : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
            }
        }
        return m[b.length][a.length];
    }

    // Fuzzy guess best intent for short queries with typos
    fuzzyGuessIntent(text) {
        const t = text.toLowerCase().trim();
        if (t.length < 3 || t.length > 25) return null;
        let best = { name: null, dist: Infinity, kw: "" };
        for (const [name, kws] of Object.entries(this.intents)) {
            for (const kw of kws) {
                const k = kw.trim();
                if (k.length < 3) continue;
                const d = this.levenshtein(t, k);
                const tol = Math.max(1, Math.floor(k.length * 0.3));
                if (d <= tol && d < best.dist) best = { name, dist: d, kw: k };
            }
        }
        return best.name ? best : null;
    }

    // ─── EXTRA CALCULATORS ───────────────────────────────────────────────────
    calculateGoalSIP(target, annualRate, months) {
        if (!(target > 0) || !(months > 0)) return null;
        const r = (annualRate || 0) / 12 / 100;
        if (r === 0) return { monthly: target / months };
        const monthly = (target * r) / ((Math.pow(1 + r, months) - 1) * (1 + r));
        return { monthly };
    }

    calculateStepUpSIP(monthly, annualRate, months, stepUpPct) {
        if (!(monthly > 0) || !(months > 0)) return null;
        const r = (annualRate || 0) / 12 / 100;
        const step = (stepUpPct || 0) / 100;
        let fv = 0;
        let invested = 0;
        let current = monthly;
        for (let i = 0; i < months; i++) {
            fv = (fv + current) * (1 + r);
            invested += current;
            if ((i + 1) % 12 === 0) current = current * (1 + step);
        }
        return { fv, invested, gain: fv - invested };
    }

    calculatePrepaymentSavings(principal, rate, months, prepayAmount, prepayMonth) {
        const base = this.calculateEMI(principal, rate, months);
        if (!base) return null;
        const r = rate / 12 / 100;
        const emi = base.emi;
        let bal = principal;
        for (let i = 1; i <= prepayMonth; i++) {
            const interest = bal * r;
            const princPart = emi - interest;
            bal -= princPart;
        }
        bal = Math.max(0, bal - prepayAmount);
        let newMonths = prepayMonth;
        while (bal > 0.01 && newMonths < months * 3) {
            const interest = bal * r;
            const princPart = emi - interest;
            if (princPart <= 0) return null;
            bal -= princPart;
            newMonths++;
        }
        const newTotal = emi * newMonths + prepayAmount;
        const savedInterest = base.total - newTotal;
        const savedMonths = months - newMonths;
        return { newMonths, savedMonths, savedInterest, newTotal };
    }

    // ─── LOAN / CALC PARAMETER PARSER ───────────────────────────────────────
    parseLoanParams(rawText) {
        const text = rawText.toLowerCase();

        // Rate: e.g. "9%", "9 percent", "at 8.5"
        let rate = null;
        const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent|pct)/);
        if (rateMatch) rate = parseFloat(rateMatch[1]);
        if (rate === null) {
            const atMatch = text.match(/(?:at|@)\s*(\d+(?:\.\d+)?)/);
            if (atMatch) rate = parseFloat(atMatch[1]);
        }

        // Tenure: years or months
        let months = null;
        const yrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yr\b|y\b)/);
        if (yrMatch) months = Math.round(parseFloat(yrMatch[1]) * 12);
        if (months === null) {
            const moMatch = text.match(/(\d+)\s*(?:months?|mo\b|mos\b|m\b)/);
            if (moMatch) months = parseInt(moMatch[1], 10);
        }

        // Principal/Amount: pick first amount that's NOT the rate or tenure
        // Strip rate and tenure phrases first, then parse Indian amount on remainder.
        let stripped = text
            .replace(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent|pct)/g, " ")
            .replace(/(?:at|@)\s*(\d+(?:\.\d+)?)/g, " ")
            .replace(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yr\b|y\b)/g, " ")
            .replace(/(\d+)\s*(?:months?|mo\b|mos\b|m\b)/g, " ");
        const principal = this.parseIndianAmount(stripped);

        return { principal, rate, months };
    }

    // Merge missing fields with conversation context for follow-ups like
    // "what about at 10%?" or "for 20 years instead?"
    mergeWithContext(params) {
        const ctx = this.chatContext;
        return {
            principal: params.principal != null ? params.principal : ctx.lastAmount,
            rate:      params.rate      != null ? params.rate      : ctx.lastRate,
            months:    params.months    != null ? params.months    : ctx.lastMonths
        };
    }

    saveContext(intent, params = {}) {
        this.chatContext.lastIntent = intent;
        if (params.principal != null) this.chatContext.lastAmount = params.principal;
        if (params.rate != null)      this.chatContext.lastRate   = params.rate;
        if (params.months != null)    this.chatContext.lastMonths = params.months;
    }

    // Append contextual quick-suggestion line to bot replies
    suggestionsFor(intent) {
        const map = {
            emi_calc:     ["💡 Ask: 'What if rate is 8%?' or 'For 20 years instead?' or 'Prepay 1 lakh after 12 months?'"],
            loan_calc:    ["💡 Ask: 'What if rate is 8%?' or 'For 20 years instead?' or 'Prepay 1 lakh after 12 months?'"],
            sip_calc:     ["💡 Ask: 'Step up SIP by 10%?' or 'How much SIP for 1 crore in 20 years?'"],
            fd_calc:      ["💡 Ask: 'What if rate is 8%?' or 'For 10 years instead?'"],
            invest:       ["💡 Try: 'SIP of 5000 at 12% for 10 years' or 'PPF', 'EPF', 'NPS'"],
            budget_status:["💡 Try: 'How to save more', 'Health score', 'Reduce expenses'"],
            balance:      ["💡 Try: 'Can I afford a 50000 phone?' or 'Forecast'"],
            help:         [],
            tip_of_day:   ["💡 Ask: 'Money fact', 'Tell me a joke', or 'Motivate me'"],
            fact:         ["💡 Ask: 'Daily tip' or 'Tell me a joke'"],
            joke:         ["💡 Ask: 'Money fact' or 'Daily tip'"]
        };
        const list = map[intent];
        if (!list || !list.length) return "";
        return "\n\n" + list[Math.floor(Math.random() * list.length)];
    }

    // ─── FINANCIAL FORMULAS ─────────────────────────────────────────────────
    calculateEMI(principal, annualRate, months) {
        if (!(principal > 0) || !(months > 0)) return null;
        const r = (annualRate || 0) / 12 / 100;
        let emi;
        if (r === 0) emi = principal / months;
        else emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        const total = emi * months;
        const interest = total - principal;
        return { emi, total, interest };
    }

    calculateSIP(monthly, annualRate, months) {
        if (!(monthly > 0) || !(months > 0)) return null;
        const r = (annualRate || 0) / 12 / 100;
        let fv;
        if (r === 0) fv = monthly * months;
        else fv = monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
        const invested = monthly * months;
        return { fv, invested, gain: fv - invested };
    }

    calculateFD(principal, annualRate, years, freq = 4) {
        if (!(principal > 0) || !(years > 0)) return null;
        const r = (annualRate || 0) / 100;
        const fv = principal * Math.pow(1 + r / freq, freq * years);
        return { fv, interest: fv - principal };
    }

    // ─── HANDLE CHAT SUBMIT ──────────────────────────────────────────────────
    handleChatQuestion() {
        const question = this.elements.chatQuestion.value.trim();
        if (!question) {
            this.showToast("Type a question first!", "warning");
            return;
        }

        const summary = this.calculateSummary();
        this.addChatMessage(question, "user");
        this.elements.chatForm.reset();

        const typingEl = this.showTypingIndicator();

        // Small typing delay so it feels natural
        const delay = 380 + Math.min(question.length * 8, 600);
        setTimeout(() => {
            this.removeTypingIndicator(typingEl);
            let response = this.generateChatResponse(question, summary);
            const tail = this.suggestionsFor(this.chatContext.lastIntent);
            if (tail && !response.includes("💡")) response += tail;
            this.chatContext.lastQuestion = question;
            this.addChatMessage(response, "bot");
        }, delay);
    }

    showTypingIndicator() {
        const wrap = document.createElement("div");
        wrap.className = "message-wrap message-wrap--bot typing-wrap";
        wrap.innerHTML = `
            <div class="message message--bot typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        this.elements.chatMessages.appendChild(wrap);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        return wrap;
    }

    removeTypingIndicator(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ─── RESPONSE ENGINE ─────────────────────────────────────────────────────
    generateChatResponse(question, summary) {
        const q      = question.toLowerCase();
        const intents = this.intents;
        const I      = (keys) => this.matchesIntent(q, keys);
        const fc     = (v)    => this.formatCurrency(v);
        const fp     = (v)    => this.formatPercent(v);
        const amount = this.parseIndianAmount(question);

        // ── GREETINGS ────────────────────────────────────────────────────────
        if (I(intents.greeting)) {
            const greetings = [
                "👋 Hello! I'm your Budget Advisor. Ask me anything about your income, expenses, savings, or goals!",
                "😊 Hey there! Ready to help with your budget. What would you like to know?",
                "🙏 Namaste! I'm here to help you plan your money better. What's on your mind?"
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }

        // ── THANKS ───────────────────────────────────────────────────────────
        if (I(intents.thanks)) {
            return "😊 You're welcome! Happy to help. Ask me anything else about your budget anytime!";
        }

        // ── HELP ─────────────────────────────────────────────────────────────
        if (I(intents.help)) {
            return "🤖 Here's everything I can help with:\n\n" +
                "🧮 CALCULATORS\n" +
                "• EMI / Loan: 'EMI for 10 lakh at 9% for 5 years'\n" +
                "• SIP: 'SIP of 5000 at 12% for 10 years'\n" +
                "• Step-up SIP: 'Step up SIP of 5000 at 12% for 20 years step up by 10%'\n" +
                "• Goal SIP: 'How much SIP for 1 crore in 20 years'\n" +
                "• FD / RD: 'FD of 1 lakh at 7% for 5 years'\n" +
                "• Compound interest: 'CI on 1 lakh at 8% for 10 years'\n" +
                "• Inflation: 'Inflation on 1 lakh in 10 years at 6%'\n" +
                "• Debt payoff: 'Debt payoff for 2 lakh at 18%'\n" +
                "• Loan prepayment: 'Prepay 2 lakh after 24 months'\n" +
                "• Take-home from CTC: 'Take home from 12 lakh CTC'\n" +
                "• Rule of 72 — when does my money double?\n\n" +
                "📊 YOUR BUDGET\n" +
                "• How is my budget? / What is my balance?\n" +
                "• What is my income / savings rate?\n" +
                "• How is my rent / food / transport spending?\n" +
                "• Am I overspending?\n\n" +
                "💡 ADVICE\n" +
                "• How do I save more? / Reduce expenses\n" +
                "• Should I invest? / Emergency fund\n" +
                "• Retirement plan / Financial freedom (FIRE)\n" +
                "• Rent vs Buy / Salary hike planning\n" +
                "• PPF / EPF / NPS basics\n" +
                "• Tax estimate / Credit score (CIBIL) tips\n" +
                "• Can I afford a 50000 phone?\n\n" +
                "✨ FUN & BREAK\n" +
                "• Tip of the day / Money fact / Tell me a joke\n" +
                "• Motivate me — I'm stressed about money\n\n" +
                "🧠 SMART FOLLOW-UPS\n" +
                "After any calc, just ask: 'What if rate is 8%?', 'For 20 years instead?', 'Step up by 10%?'\n\n" +
                "📖 BASICS\n" +
                "• What is the 50/30/20 rule?\n\n" +
                "🗑️ Clear chat — wipes our conversation\n\n" +
                "I understand: 1 lakh, 50 thousand, 2 crore, 15000, 9%, 5 years, 60 months — and typos.";
        }

        // ── CLEAR CHAT ───────────────────────────────────────────────────────
        if (I(intents.clear_chat)) {
            setTimeout(() => this.clearChat(), 400);
            return "🗑️ Sure! Clearing the chat now...";
        }

        // ── 50/30/20 RULE ────────────────────────────────────────────────────
        if (I(intents.rule_5030)) {
            return "📖 The 50/30/20 Rule is a simple budgeting method:\n\n" +
                "🏠 50% on NEEDS — rent, food, transport, utilities\n" +
                "🎬 30% on WANTS — entertainment, subscriptions, eating out\n" +
                "💰 20% on SAVINGS — emergency fund, investments, goals\n\n" +
                "This tool checks your spending against these targets automatically!";
        }

        // ── EMERGENCY FUND ───────────────────────────────────────────────────
        if (I(intents.emergency)) {
            if (summary.income <= 0) {
                return "🚨 An emergency fund is 3–6 months of your expenses kept aside for unexpected events like job loss, medical bills, or urgent repairs. Add your income first and I can calculate a target for you!";
            }
            const target = summary.totalExpenses > 0
                ? summary.totalExpenses * 3
                : summary.income * 3;
            return `🚨 An emergency fund should cover 3–6 months of expenses.\n\nYour current monthly expenses: ${fc(summary.totalExpenses)}\n✅ Recommended minimum: ${fc(target)} (3 months)\n\nBuild this before investing. Keep it in a savings account you can access quickly.`;
        }

        // ── INVESTMENT ADVICE ────────────────────────────────────────────────
        if (I(intents.invest)) {
            if (summary.income <= 0) {
                return "📈 Add your income first so I can check if you're ready to invest. Generally, you should have an emergency fund and be saving 20%+ before investing.";
            }
            if (summary.savingsRate < 10) {
                return `📈 Your savings rate is only ${fp(summary.savingsRate)} right now. It's better to first reach at least 20% savings before investing. Focus on reducing expenses first.`;
            }
            if (summary.savingsRate >= 20) {
                return `📈 Great news — you're saving ${fp(summary.savingsRate)} of income! You're in a good position to invest.\n\n💡 Common options:\n• SIP in mutual funds (low risk, long term)\n• PPF or NPS (tax saving)\n• Fixed Deposits (safe, low return)\n• Stocks/Equity (higher risk, higher return)\n\nAlways build an emergency fund first before investing!`;
            }
            return `📈 You're saving ${fp(summary.savingsRate)} right now. Try to reach 20% savings first, then use any extra for investing. Small SIP investments can start even with just Rs 500/month!`;
        }

        // ── HEALTH SCORE ─────────────────────────────────────────────────────
        if (I(intents.health_score)) {
            if (summary.income <= 0) {
                return "❤️ Add your income first and I'll calculate your Budget Health Score!";
            }
            const health = this.calculateHealthScore(summary);
            let advice = "";
            if (health.score >= 75) advice = "✅ Your budget is in great shape! Keep it up.";
            else if (health.score >= 50) advice = "⚠️ Your budget is moderate. Focus on savings and reducing wants.";
            else advice = "❌ Your budget needs attention. Try cutting discretionary spending.";
            return `❤️ Your Budget Health Score is ${health.score}/100 — ${health.status}.\n\n${advice}\n\nNeeds: ${fp(summary.needsRate)} | Wants: ${fp(summary.wantsRate)} | Savings: ${fp(summary.savingsRate)}`;
        }

        // ── EMI / LOAN CALCULATOR ────────────────────────────────────────────
        if (I(intents.emi_calc) || I(intents.loan_calc)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const { principal, rate, months } = merged;
            if (!principal || !rate || !months) {
                return `🏦 EMI / Loan Calculator\n\nGive me 3 things:\n• Loan amount (e.g. 10 lakh)\n• Interest rate (e.g. 9%)\n• Tenure (e.g. 5 years or 60 months)\n\n💡 Try: "EMI for 10 lakh at 9% for 5 years" or "Loan of 5 lakh at 11% for 3 years".\n\nMissing: ${[!principal && "amount", !rate && "rate", !months && "tenure"].filter(Boolean).join(", ")}.`;
            }
            this.saveContext("emi_calc", { principal, rate, months });
            const r = this.calculateEMI(principal, rate, months);
            const years = (months / 12).toFixed(months % 12 === 0 ? 0 : 1);
            let advice = "";
            if (summary.income > 0) {
                const emiPctIncome = (r.emi / summary.income) * 100;
                if (emiPctIncome > 40) advice = `\n\n⚠️ This EMI is ${fp(emiPctIncome)} of your income — too high. Banks usually cap total EMIs at 40–50%.`;
                else if (emiPctIncome > 25) advice = `\n\n⚠️ This EMI is ${fp(emiPctIncome)} of your income. Manageable but tight.`;
                else advice = `\n\n✅ This EMI is only ${fp(emiPctIncome)} of your income — comfortable.`;
            }
            return `🏦 EMI Calculation\n\n💰 Loan amount: ${fc(principal)}\n📊 Interest rate: ${rate}% per year\n📅 Tenure: ${months} months (${years} years)\n\n📌 Monthly EMI: ${fc(r.emi)}\n💸 Total interest: ${fc(r.interest)}\n💳 Total payment: ${fc(r.total)}${advice}`;
        }

        // ── SIP CALCULATOR ───────────────────────────────────────────────────
        if (I(intents.sip_calc) && !I(intents.step_up_sip) && !I(intents.goal_sip)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const { principal: monthly, rate, months } = merged;
            if (monthly) this.saveContext("sip_calc", { principal: monthly, rate, months });
            if (!monthly || !rate || !months) {
                return `📈 SIP Calculator\n\nGive me 3 things:\n• Monthly SIP amount (e.g. 5000)\n• Expected return rate (e.g. 12%)\n• Tenure (e.g. 10 years)\n\n💡 Try: "SIP of 5000 at 12% for 10 years".\n\nMissing: ${[!monthly && "monthly amount", !rate && "rate", !months && "tenure"].filter(Boolean).join(", ")}.`;
            }
            const r = this.calculateSIP(monthly, rate, months);
            const years = (months / 12).toFixed(months % 12 === 0 ? 0 : 1);
            return `📈 SIP Projection\n\n💵 Monthly SIP: ${fc(monthly)}\n📊 Expected return: ${rate}% per year\n📅 Duration: ${months} months (${years} years)\n\n💰 Total invested: ${fc(r.invested)}\n🚀 Wealth gained: ${fc(r.gain)}\n🎯 Final corpus: ${fc(r.fv)}\n\n💡 The power of compounding! Start early, stay consistent.`;
        }

        // ── FD / RD CALCULATOR ───────────────────────────────────────────────
        if (I(intents.fd_calc)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const { principal, rate, months } = merged;
            if (principal) this.saveContext("fd_calc", { principal, rate, months });
            if (!principal || !rate || !months) {
                return `🏛️ FD / RD Calculator\n\nGive me 3 things:\n• Deposit amount (e.g. 1 lakh)\n• Interest rate (e.g. 7%)\n• Tenure (e.g. 5 years)\n\n💡 Try: "FD of 1 lakh at 7% for 5 years".\n\nMissing: ${[!principal && "amount", !rate && "rate", !months && "tenure"].filter(Boolean).join(", ")}.`;
            }
            const years = months / 12;
            const r = this.calculateFD(principal, rate, years);
            return `🏛️ FD Maturity\n\n💰 Principal: ${fc(principal)}\n📊 Rate: ${rate}% per year (compounded quarterly)\n📅 Tenure: ${years.toFixed(years % 1 === 0 ? 0 : 1)} years\n\n🎯 Maturity value: ${fc(r.fv)}\n💸 Interest earned: ${fc(r.interest)}\n\n💡 FD interest is fully taxable. Consider tax-free options like PPF for long term.`;
        }

        // ── INFLATION ────────────────────────────────────────────────────────
        if (I(intents.inflation)) {
            const { principal, rate, months } = this.parseLoanParams(question);
            const infRate = rate || 6;
            const years = months ? months / 12 : 10;
            if (!principal) {
                return `📉 Inflation eats your money's value!\n\nIndia's average inflation: ~6% per year.\nAt 6%, prices double every 12 years.\n\n💡 Try: "Inflation effect on 1 lakh in 10 years at 6%" to see how purchasing power drops.\n\nLesson: keeping money idle in a savings account loses value. Invest above the inflation rate!`;
            }
            const futureCost = principal * Math.pow(1 + infRate / 100, years);
            const realValue = principal / Math.pow(1 + infRate / 100, years);
            return `📉 Inflation Impact\n\n💰 Today's amount: ${fc(principal)}\n📊 Inflation rate: ${infRate}% per year\n📅 After ${years.toFixed(years % 1 === 0 ? 0 : 1)} years:\n\n🔺 Same items will cost: ${fc(futureCost)}\n🔻 Real value of ${fc(principal)} today = ${fc(realValue)} in future\n\n💡 To beat inflation, your investments must earn more than ${infRate}% per year.`;
        }

        // ── DEBT PAYOFF ──────────────────────────────────────────────────────
        if (I(intents.debt_payoff)) {
            const { principal, rate } = this.parseLoanParams(question);
            const surplus = Math.max(summary.remainingBalance, 0);
            if (!principal) {
                return `💣 Debt Payoff Plan\n\nTell me your debt amount and interest rate.\n💡 Try: "Debt payoff plan for 2 lakh at 18%"\n\nGeneral tips:\n• Pay highest-interest debt first (avalanche method)\n• Or pay smallest balance first for motivation (snowball)\n• Never pay only minimum on credit cards (36–42% interest!)\n• Consider balance transfer or personal loan to reduce rate`;
            }
            const r = rate || 18;
            const monthly = surplus > 0 ? surplus : principal * 0.05;
            const monthlyRate = r / 12 / 100;
            // Months to payoff: n = -log(1 - P*i/EMI) / log(1+i)
            let payoffMonths;
            if (monthly <= principal * monthlyRate) {
                payoffMonths = Infinity;
            } else {
                payoffMonths = Math.ceil(-Math.log(1 - (principal * monthlyRate) / monthly) / Math.log(1 + monthlyRate));
            }
            const totalPaid = payoffMonths === Infinity ? Infinity : monthly * payoffMonths;
            const interestPaid = totalPaid === Infinity ? Infinity : totalPaid - principal;
            if (payoffMonths === Infinity) {
                const minNeeded = principal * monthlyRate * 1.5;
                return `💣 Debt Payoff Plan\n\n💰 Debt: ${fc(principal)} at ${r}%\n💵 Monthly payment available: ${fc(monthly)}\n\n❌ This payment is too low — interest grows faster than you pay!\n📈 You need at least ${fc(minNeeded)}/month to make a dent.\n\n💡 Reduce expenses or use snowball method on smaller debts first.`;
            }
            return `💣 Debt Payoff Plan\n\n💰 Debt: ${fc(principal)} at ${r}% per year\n💵 Monthly payment: ${fc(monthly)}${surplus > 0 ? " (your current surplus)" : " (suggested 5% of debt)"}\n\n⏳ Payoff time: ${payoffMonths} months (${(payoffMonths / 12).toFixed(1)} years)\n💸 Total interest: ${fc(interestPaid)}\n💳 Total paid: ${fc(totalPaid)}\n\n💡 Pay even ${fc(monthly * 0.2)} extra/month to finish faster!`;
        }

        // ── RETIREMENT PLANNING ──────────────────────────────────────────────
        if (I(intents.retirement)) {
            const monthly = Math.max(summary.remainingBalance, 0);
            const monthlyExpense = summary.totalExpenses > 0 ? summary.totalExpenses : (summary.income * 0.7);
            // Target corpus = 25x annual expenses (4% rule), inflation-adjusted at 6% over 30 yrs
            const annualExpenseToday = monthlyExpense * 12;
            const yearsToRetire = 30;
            const futureAnnualExpense = annualExpenseToday * Math.pow(1.06, yearsToRetire);
            const corpusNeeded = futureAnnualExpense * 25;
            if (monthly <= 0 || summary.income <= 0) {
                return `🌴 Retirement Planning\n\nA simple rule: you need 25× your annual expenses as a retirement corpus (the 4% rule).\n\n💡 Add your income & expenses first, and I'll calculate exactly how much SIP you need.\n\nGeneral guideline: invest 15–20% of income from your 20s for a comfortable retirement.`;
            }
            // SIP needed: PMT = FV * r / ((1+r)^n - 1) ; using annual r=12%, monthly
            const r = 0.12 / 12;
            const n = yearsToRetire * 12;
            const sipNeeded = (corpusNeeded * r) / (Math.pow(1 + r, n) - 1);
            const projection = this.calculateSIP(monthly, 12, n);
            const status = projection.fv >= corpusNeeded
                ? `✅ At your current saving rate, you'll have ${fc(projection.fv)} — more than enough!`
                : `⚠️ At your current saving of ${fc(monthly)}/month, you'll have ${fc(projection.fv)} — short by ${fc(corpusNeeded - projection.fv)}.\n\n📌 You should invest ${fc(sipNeeded)}/month in equity SIPs (12% return assumed).`;
            return `🌴 Retirement Planning (30-year horizon)\n\n💸 Today's monthly expenses: ${fc(monthlyExpense)}\n📈 Future expenses (with 6% inflation): ${fc(futureAnnualExpense / 12)}/month\n🎯 Corpus needed: ${fc(corpusNeeded)}\n\n${status}\n\n💡 The 4% rule: a corpus 25× your annual expenses can fund retirement indefinitely.`;
        }

        // ── FINANCIAL FREEDOM ────────────────────────────────────────────────
        if (I(intents.financial_freedom)) {
            if (summary.income <= 0) {
                return `🗽 Financial Freedom (FIRE)\n\nFinancial Freedom = your investments earn enough to cover your lifestyle, so work becomes optional.\n\nFreedom Number = 25 × annual expenses.\n\n💡 Add your income & expenses so I can calculate yours!`;
            }
            const annualExp = summary.totalExpenses * 12;
            const freedomNumber = annualExp * 25;
            const monthly = Math.max(summary.remainingBalance, 0);
            if (monthly <= 0) {
                return `🗽 Your Financial Freedom Number\n\n💰 Target corpus: ${fc(freedomNumber)} (25× annual expenses of ${fc(annualExp)})\n\n❌ But right now you have no surplus to invest. Reduce expenses first!`;
            }
            // Years to FI at 12% annual
            const r = 0.12 / 12;
            // n = log(FV*r/PMT + 1) / log(1+r)
            const n = Math.ceil(Math.log((freedomNumber * r) / monthly + 1) / Math.log(1 + r));
            const years = (n / 12).toFixed(1);
            return `🗽 Your Financial Freedom Number\n\n💰 Target corpus: ${fc(freedomNumber)}\n   (25× your yearly expenses of ${fc(annualExp)})\n\n💵 Investing ${fc(monthly)}/month at 12% returns\n⏳ You reach freedom in ~${years} years (${n} months)\n\n💡 Increase your savings rate to get there sooner. Every 1% extra saved cuts months off!`;
        }

        // ── TAX BASICS ───────────────────────────────────────────────────────
        if (I(intents.tax_basic)) {
            const annualIncome = summary.income * 12;
            // FY 2025-26 New Regime slabs (simplified)
            let tax = 0;
            const slabs = [
                [400000, 0],
                [800000, 0.05],
                [1200000, 0.10],
                [1600000, 0.15],
                [2000000, 0.20],
                [2400000, 0.25],
                [Infinity, 0.30]
            ];
            let prev = 0;
            let breakdown = "";
            for (const [limit, rate] of slabs) {
                if (annualIncome <= prev) break;
                const taxable = Math.min(annualIncome, limit) - prev;
                const slabTax = taxable * rate;
                tax += slabTax;
                if (rate > 0) breakdown += `   • ${fp(rate * 100).replace(".0", "")} on ${fc(taxable)} = ${fc(slabTax)}\n`;
                prev = limit;
            }
            // Section 87A rebate: full rebate for income up to 12 lakh in new regime
            const rebate = annualIncome <= 1200000 ? tax : 0;
            const finalTax = Math.max(tax - rebate, 0);
            const cess = finalTax * 0.04;
            const totalTax = finalTax + cess;
            if (summary.income <= 0) {
                return `🧾 Income Tax (New Regime, FY 2025-26)\n\nSlabs:\n• Up to ₹4L: Nil\n• ₹4L–8L: 5%\n• ₹8L–12L: 10%\n• ₹12L–16L: 15%\n• ₹16L–20L: 20%\n• ₹20L–24L: 25%\n• Above ₹24L: 30%\n\n💡 Rebate u/s 87A: zero tax up to ₹12L income.\n\nAdd your income and I'll calculate your tax!`;
            }
            return `🧾 Tax Estimate (New Regime, FY 2025-26)\n\n💼 Annual income: ${fc(annualIncome)}\n\nSlab-wise:\n${breakdown || "   (Within nil slab)\n"}\n📊 Tax before rebate: ${fc(tax)}\n${rebate > 0 ? `🎁 87A rebate: -${fc(rebate)}\n` : ""}➕ 4% cess: ${fc(cess)}\n\n💸 Total tax payable: ${fc(totalTax)}\n📅 Monthly TDS approx: ${fc(totalTax / 12)}\n\n💡 New Regime has no major deductions but lower rates. Old regime helps if you claim 80C, HRA, home loan etc.`;
        }

        // ── CREDIT SCORE ─────────────────────────────────────────────────────
        if (I(intents.credit_score)) {
            return `📊 Credit Score (CIBIL) Tips\n\n• 750+ = excellent (best loan rates)\n• 700–749 = good\n• 650–699 = fair\n• Below 650 = poor (loan rejection risk)\n\n💡 To improve:\n• Pay EMIs and credit card bills on time (most important!)\n• Keep credit utilization below 30%\n• Don't close old credit cards (lowers credit history age)\n• Limit new loan applications\n• Check your CIBIL report once a year (free at cibil.com)`;
        }

        // ── MOTIVATION ───────────────────────────────────────────────────────
        if (I(intents.motivation)) {
            const messages = [
                "💪 Money troubles feel overwhelming, but you're already ahead by tracking your budget. Small consistent steps beat perfection.",
                "🌱 Wealth grows slowly, like a tree. Every rupee saved today is a leaf on tomorrow's tree. Keep going!",
                "🚀 Even ₹500/month invested for 30 years at 12% becomes ~₹17 lakh. Time + consistency = wealth.",
                "🌟 Don't compare your start to someone else's middle. Your journey is your own. One step at a time."
            ];
            return messages[Math.floor(Math.random() * messages.length)];
        }

        // ── SAVINGS FORECAST ─────────────────────────────────────────────────
        if (I(intents.forecast)) {
            if (summary.income <= 0) {
                return "🔮 Add your income and expenses first, then I can forecast your future savings!";
            }
            const monthly  = Math.max(summary.remainingBalance, 0);
            const yearly   = monthly * 12;
            const fiveYear = monthly * 60;
            if (monthly <= 0) {
                return `🔮 Right now you have no monthly surplus to save. Your expenses (${fc(summary.totalExpenses)}) exceed your income (${fc(summary.income)}). Reduce expenses to start saving!`;
            }
            return `🔮 Savings Forecast (at current rate of ${fc(monthly)}/month):\n\n📅 1 Month: ${fc(monthly)}\n📅 1 Year: ${fc(yearly)}\n📅 5 Years: ${fc(fiveYear)}\n\nThis grows even more with investments! 💹`;
        }

        // From here onward, we need income to give meaningful answers
        if (summary.income <= 0) {
            return "💡 Please save your monthly income first (Step 1 above). Once that's set, I can answer all your budget questions accurately!";
        }

        // ── BALANCE ──────────────────────────────────────────────────────────
        if (I(intents.balance)) {
            const color = summary.remainingBalance >= 0 ? "✅" : "❌";
            return `${color} Your current balance this month:\n\nIncome: ${fc(summary.income)}\nExpenses: ${fc(summary.totalExpenses)}\nBalance remaining: ${fc(summary.remainingBalance)}\n\n${summary.remainingBalance < 0 ? "⚠️ You are spending more than you earn! Try cutting some expenses." : "You have money left over this month — great!"}`;
        }

        // ── INCOME QUERY ─────────────────────────────────────────────────────
        if (I(intents.income_query)) {
            return `💵 Your saved monthly income is ${fc(summary.income)}.\n\nIdeal split (50/30/20 rule):\n🏠 Needs (50%): ${fc(summary.idealNeeds)}\n🎬 Wants (30%): ${fc(summary.idealWants)}\n💰 Savings (20%): ${fc(summary.idealSavings)}`;
        }

        // ── SAVINGS STATUS ───────────────────────────────────────────────────
        if (I(intents.savings_status)) {
            const status = summary.savingsRate >= 20
                ? `✅ You're saving ${fp(summary.savingsRate)} — above the 20% target! Great work.`
                : `⚠️ You're saving ${fp(summary.savingsRate)} — below the 20% target. Try to free up ${fc(Math.max(summary.idealSavings - summary.savingsAmount, 0))} more each month.`;
            return `💰 Savings Status:\n\nCurrent monthly savings: ${fc(summary.savingsAmount)}\nSavings rate: ${fp(summary.savingsRate)}\n\n${status}`;
        }

        // ── HOW TO SAVE MORE ─────────────────────────────────────────────────
        if (I(intents.save_more)) {
            const tips = [];
            if (summary.categoryTotals.Food > summary.income * 0.25)
                tips.push("🍛 Reduce food spending — try meal prep and cooking at home");
            if (summary.categoryTotals.Entertainment > summary.income * 0.15)
                tips.push("🎬 Cut entertainment — review subscriptions you rarely use");
            if (summary.categoryTotals.Rent > summary.income * 0.4)
                tips.push("🏠 Your rent is very high — consider a cheaper option if possible");
            if (summary.categoryTotals.Other > summary.income * 0.1)
                tips.push("📦 'Other' spending is high — track what falls in this category");
            tips.push("📲 Automate savings — set up an auto-transfer on salary day");
            tips.push("🎯 Set a monthly savings goal and track it here");
            return `💡 Tips to save more:\n\n${tips.map(t => "• " + t).join("\n")}\n\nYou need ${fc(Math.max(summary.idealSavings - summary.savingsAmount, 0))} more in savings to hit the 20% target.`;
        }

        // ── CAN I AFFORD / BUY ───────────────────────────────────────────────
        if (I(intents.afford_buy)) {
            if (!amount) {
                return `🛒 Tell me the price and I'll check if you can afford it!\n\nExample: "Can I afford a 1 lakh phone?" or "Can I buy a 50 thousand laptop?"\n\nYour current balance: ${fc(summary.remainingBalance)}`;
            }
            const amountLabel = fc(amount);
            if (summary.remainingBalance <= 0) {
                return `❌ Sorry, you can't afford ${amountLabel} right now. Your balance is ${fc(summary.remainingBalance)} — you're already overspending. Reduce expenses first!`;
            }
            if (amount <= summary.remainingBalance && summary.savingsRate >= 20) {
                return `✅ Yes! ${amountLabel} is affordable from your balance of ${fc(summary.remainingBalance)}, and your savings are healthy at ${fp(summary.savingsRate)}. Go for it!`;
            }
            if (amount <= summary.remainingBalance) {
                return `⚠️ You have enough balance (${fc(summary.remainingBalance)}) to buy ${amountLabel}, but your savings rate is only ${fp(summary.savingsRate)} — below the 20% target. Consider waiting until savings improve.`;
            }
            const gap = amount - summary.remainingBalance;
            const months = Math.ceil(gap / Math.max(summary.savingsAmount, 1));
            return `❌ Not yet. ${amountLabel} is more than your current balance of ${fc(summary.remainingBalance)}.\n\nYou're short by ${fc(gap)}.\n⏳ At your current savings rate, you could afford it in about ${months} month${months === 1 ? "" : "s"}.`;
        }

        // ── FOOD ─────────────────────────────────────────────────────────────
        if (I(intents.food_query)) {
            const pct = (summary.categoryTotals.Food / summary.income) * 100;
            const status = pct > 30 ? "⚠️ This is above the recommended 30% — try meal planning and cooking at home." : "✅ Your food spending is within a healthy range.";
            return `🍛 Food Spending:\n\nAmount: ${fc(summary.categoryTotals.Food)}\nPercentage of income: ${fp(pct)}\nRecommended max: 30% (${fc(summary.income * 0.3)})\n\n${status}`;
        }

        // ── RENT ─────────────────────────────────────────────────────────────
        if (I(intents.rent_query)) {
            const pct = (summary.categoryTotals.Rent / summary.income) * 100;
            const status = pct > 40 ? "⚠️ Rent is above 40% of income — this limits savings. Try to negotiate or find a cheaper option." : "✅ Your rent is within a manageable range (under 40%).";
            return `🏠 Rent Spending:\n\nAmount: ${fc(summary.categoryTotals.Rent)}\nPercentage of income: ${fp(pct)}\nRecommended max: 40% (${fc(summary.income * 0.4)})\n\n${status}`;
        }

        // ── TRANSPORT ────────────────────────────────────────────────────────
        if (I(intents.transport_query)) {
            const pct = (summary.categoryTotals.Transport / summary.income) * 100;
            return `🚌 Transport Spending:\n\nAmount: ${fc(summary.categoryTotals.Transport)}\nPercentage of income: ${fp(pct)}\n\n${pct > 15 ? "⚠️ Transport is over 15% of income. Carpooling, monthly passes, or WFH days can help." : "✅ Transport looks reasonable!"}`;
        }

        // ── UTILITIES ────────────────────────────────────────────────────────
        if (I(intents.utilities_query)) {
            const pct = (summary.categoryTotals.Utilities / summary.income) * 100;
            return `💡 Utilities Spending:\n\nAmount: ${fc(summary.categoryTotals.Utilities)}\nPercentage of income: ${fp(pct)}\n\n${pct > 10 ? "⚠️ Utilities seem high. Check for energy-saving habits or better internet/phone plans." : "✅ Utilities are under control!"}`;
        }

        // ── ENTERTAINMENT ────────────────────────────────────────────────────
        if (I(intents.entertainment_query)) {
            const pct = (summary.categoryTotals.Entertainment / summary.income) * 100;
            return `🎬 Entertainment Spending:\n\nAmount: ${fc(summary.categoryTotals.Entertainment)}\nPercentage of income: ${fp(pct)}\nRecommended max: 10–15%\n\n${pct > 15 ? "⚠️ Entertainment is a bit high. Review subscriptions and see what you can cut." : "✅ Entertainment spending looks fine!"}`;
        }

        // ── BUDGET STATUS ────────────────────────────────────────────────────
        if (I(intents.budget_status)) {
            const health = this.calculateHealthScore(summary);
            const highest = summary.categoryPercentages.slice().sort((a, b) => b.amount - a.amount)[0];
            return `📊 Your Budget Overview:\n\nIncome: ${fc(summary.income)}\nTotal Expenses: ${fc(summary.totalExpenses)}\nBalance: ${fc(summary.remainingBalance)}\nSavings Rate: ${fp(summary.savingsRate)}\nHealth Score: ${health.score}/100 (${health.status})\n\nBiggest expense: ${highest.category} at ${fc(highest.amount)} (${fp(highest.percentage)})\n\n${health.score >= 75 ? "✅ You're doing great!" : health.score >= 50 ? "⚠️ Some areas need improvement." : "❌ Your budget needs attention. Ask me for tips!"}`;
        }

        // ── OVERSPENDING ─────────────────────────────────────────────────────
        if (I(intents.overspending)) {
            if (summary.remainingBalance >= 0) {
                return `✅ You're not overspending! Your balance is ${fc(summary.remainingBalance)} this month. Keep it up!`;
            }
            return `❌ Yes, you are overspending by ${fc(Math.abs(summary.remainingBalance))} this month!\n\nYour income: ${fc(summary.income)}\nYour expenses: ${fc(summary.totalExpenses)}\n\n💡 Quick fixes:\n• Reduce entertainment or 'Other' spending first\n• Check if any expense is unusually high this month\n• Ask me "How to reduce expenses?" for tips`;
        }

        // ── REDUCE EXPENSES ──────────────────────────────────────────────────
        if (I(intents.reduce_expenses)) {
            const lines = ["💡 Ways to reduce your expenses:\n"];
            if (summary.categoryTotals.Food > 0)
                lines.push(`• 🍛 Food (${fc(summary.categoryTotals.Food)}): Cook at home, buy in bulk, avoid daily restaurant meals`);
            if (summary.categoryTotals.Entertainment > 0)
                lines.push(`• 🎬 Entertainment (${fc(summary.categoryTotals.Entertainment)}): Cancel unused subscriptions, use free streaming options`);
            if (summary.categoryTotals.Transport > 0)
                lines.push(`• 🚌 Transport (${fc(summary.categoryTotals.Transport)}): Use monthly passes, carpool, or work from home when possible`);
            if (summary.categoryTotals.Utilities > 0)
                lines.push(`• 💡 Utilities (${fc(summary.categoryTotals.Utilities)}): Switch off unused appliances, negotiate better internet plans`);
            lines.push(`• 📦 Avoid impulse buying — wait 24 hours before any big purchase`);
            lines.push(`• 🎯 Set a weekly spending limit for non-essential items`);
            return lines.join("\n");
        }

        // ── GOAL QUERY ───────────────────────────────────────────────────────
        if (I(intents.goal_query)) {
            const monthly = Math.max(summary.remainingBalance, 0);
            if (monthly <= 0) {
                return `🎯 You need a positive monthly surplus to work towards a goal. Right now your balance is ${fc(summary.remainingBalance)}. Reduce expenses first!\n\nUse the Goal Planner (Step 5 above) once you have savings.`;
            }
            if (amount) {
                const months = Math.ceil(amount / monthly);
                const years  = (months / 12).toFixed(1);
                return `🎯 For a goal of ${fc(amount)}:\n\nYour monthly savings: ${fc(monthly)}\nTime to reach goal: ${months} months (${years} years)\n\nUse the Goal Planner (Step 5 above) for more details!`;
            }
            return `🎯 You're currently saving ${fc(monthly)}/month.\n\nTell me your goal amount and I'll calculate how long it'll take!\nExample: "I want to save 5 lakhs for a car"\n\nOr use the Goal Planner in Step 5 above for a detailed plan.`;
        }

        // ── WHO ARE YOU ──────────────────────────────────────────────────────
        if (I(intents.who_are_you)) {
            return "🤖 I'm your Budget Advisor — a friendly assistant built into this Budget Planner.\n\nI can:\n• Crunch EMIs, SIPs, FDs, taxes, retirement & FIRE numbers\n• Read your saved income & expenses to give personalized advice\n• Remember our last topic — try follow-ups like 'what about at 8%?' or 'for 20 years instead?'\n• Tell you a joke, a money fact, or a daily tip when you need a break\n\nType 'Help' to see every topic I cover.";
        }

        // ── JOKE / FACT / TIP ────────────────────────────────────────────────
        if (I(intents.joke)) {
            return this.jokes[Math.floor(Math.random() * this.jokes.length)];
        }
        if (I(intents.fact)) {
            return this.moneyFacts[Math.floor(Math.random() * this.moneyFacts.length)];
        }
        if (I(intents.tip_of_day)) {
            return this.dailyTips[Math.floor(Math.random() * this.dailyTips.length)];
        }

        // ── RULE OF 72 ───────────────────────────────────────────────────────
        if (I(intents.rule_of_72)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const r = merged.rate || 12;
            const years = 72 / r;
            return `⏳ Rule of 72\n\nDivide 72 by your annual return rate to get years to double your money.\n\nAt ${r}% per year → money doubles in ~${years.toFixed(1)} years.\n\nQuick reference:\n• 6% (FD)  → ~12 years\n• 8% (PPF) → ~9 years\n• 12% (equity SIP) → ~6 years\n• 15% → ~4.8 years`;
        }

        // ── PPF ──────────────────────────────────────────────────────────────
        if (I(intents.ppf)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const monthly = merged.principal || 12500;
            const years = merged.months ? merged.months / 12 : 15;
            const months = years * 12;
            const r = 7.1;
            const sip = this.calculateSIP(monthly, r, months);
            return `🏦 PPF (Public Provident Fund)\n\n• Tenure: 15 years (extendable in 5-yr blocks)\n• Current rate: ~${r}% (govt-revised quarterly)\n• Max contribution: Rs 1.5 lakh/year (Rs 12,500/month)\n• 80C deduction + tax-free interest + tax-free maturity (EEE)\n• Lock-in: 15 years; partial withdrawal allowed after year 7\n\n📊 If you invest ${fc(monthly)}/month for ${years} years at ${r}%:\n• Total invested: ${fc(sip.invested)}\n• Maturity (tax-free): ${fc(sip.fv)}\n\n💡 Best 'safe' option for long-term tax-free wealth.`;
        }

        // ── EPF ──────────────────────────────────────────────────────────────
        if (I(intents.epf)) {
            return `💼 EPF (Employee Provident Fund)\n\n• Employee contributes 12% of basic + DA, employer matches 12%\n• Current interest: ~8.25% per year (tax-free, EEE)\n• Withdrawal: tax-free after 5 years of continuous service\n• Partial withdrawal allowed for housing, marriage, medical, education\n\n💡 Tips:\n• Don't withdraw EPF when changing jobs — transfer it (compounding compounds!)\n• Increase via VPF (Voluntary PF) for extra tax-free returns\n• Check balance on EPFO portal or UMANG app`;
        }

        // ── NPS ──────────────────────────────────────────────────────────────
        if (I(intents.nps)) {
            return `🏛️ NPS (National Pension System)\n\n• Long-term retirement product, govt-regulated\n• Returns: ~9–11% (mix of equity, corporate bonds, govt bonds)\n• Extra tax deduction Rs 50,000 under 80CCD(1B) — beyond 80C\n• Lock-in until age 60\n• At 60: 60% lump-sum (tax-free) + 40% must buy annuity (taxable)\n\n💡 Best as a top-up to PPF/EPF if you want extra tax saving + retirement corpus.\nOnly equity option (Active 75% E) for those under 50 to maximize returns.`;
        }

        // ── COMPOUND INTEREST ────────────────────────────────────────────────
        if (I(intents.compound)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            if (!merged.principal || !merged.rate || !merged.months) {
                return `🧮 Compound Interest Calculator\n\nGive me amount, rate and tenure.\n💡 Try: "Compound interest on 1 lakh at 8% for 10 years"`;
            }
            const years = merged.months / 12;
            const fv = merged.principal * Math.pow(1 + merged.rate / 100, years);
            this.saveContext("compound", merged);
            return `🧮 Compound Interest\n\n💰 Principal: ${fc(merged.principal)}\n📊 Rate: ${merged.rate}% per year (compounded annually)\n📅 Tenure: ${years.toFixed(1)} years\n\n🚀 Future value: ${fc(fv)}\n💸 Interest earned: ${fc(fv - merged.principal)}\n\n💡 Money compounded ${years.toFixed(1)} years grew ${(fv / merged.principal).toFixed(2)}×.`;
        }

        // ── STEP-UP SIP ──────────────────────────────────────────────────────
        if (I(intents.step_up_sip)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const stepMatch = question.match(/(?:step\s*up|increase)\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%/i);
            const stepUp = stepMatch ? parseFloat(stepMatch[1]) : 10;
            if (!merged.principal || !merged.rate || !merged.months) {
                return `📈 Step-Up SIP Calculator\n\nGive me starting SIP, return rate, tenure, and yearly step-up %.\n💡 Try: "Step up SIP of 5000 at 12% for 20 years step up by 10%"`;
            }
            const r = this.calculateStepUpSIP(merged.principal, merged.rate, merged.months, stepUp);
            const flat = this.calculateSIP(merged.principal, merged.rate, merged.months);
            this.saveContext("step_up_sip", merged);
            return `📈 Step-Up SIP Projection\n\n💵 Starting SIP: ${fc(merged.principal)}/month\n📊 Return: ${merged.rate}% | Step-up: ${stepUp}%/year\n📅 Duration: ${(merged.months / 12).toFixed(1)} years\n\n💰 Total invested: ${fc(r.invested)}\n🚀 Wealth gained: ${fc(r.gain)}\n🎯 Final corpus: ${fc(r.fv)}\n\n📊 vs flat SIP corpus: ${fc(flat.fv)}\n✨ Extra wealth from stepping up: ${fc(r.fv - flat.fv)}\n\n💡 Match step-up to your annual salary hike — painless wealth.`;
        }

        // ── GOAL-BASED SIP ───────────────────────────────────────────────────
        if (I(intents.goal_sip)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            if (!merged.principal || !merged.months) {
                return `🎯 Goal SIP Calculator\n\nTell me target amount, expected return and tenure.\n💡 Try: "How much SIP for 1 crore in 20 years at 12%"`;
            }
            const r = merged.rate || 12;
            const result = this.calculateGoalSIP(merged.principal, r, merged.months);
            const years = (merged.months / 12).toFixed(1);
            this.saveContext("goal_sip", merged);
            return `🎯 SIP Needed for Your Goal\n\n💰 Target corpus: ${fc(merged.principal)}\n📊 Expected return: ${r}% per year\n📅 Tenure: ${years} years\n\n📌 Required SIP: ${fc(result.monthly)}/month\n\n💡 Start sooner — every year delayed needs ~12% more SIP.`;
        }

        // ── PREPAYMENT SAVINGS ───────────────────────────────────────────────
        if (I(intents.prepayment)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const prepayMatch = question.match(/prepay(?:ment)?\s*(?:of\s*)?([\d.,\s]+(?:lakh|lac|crore|thousand|k)?)/i);
            const monthMatch = question.match(/after\s*(\d+)\s*month/i) || question.match(/in\s*(?:month\s*)?(\d+)/i);
            const prepay = prepayMatch ? this.parseIndianAmount(prepayMatch[1]) : null;
            const month = monthMatch ? parseInt(monthMatch[1], 10) : 12;
            if (!merged.principal || !merged.rate || !merged.months || !prepay) {
                return `💸 Loan Prepayment Savings\n\nTell me loan amount, rate, tenure and prepayment.\n💡 Try: "EMI for 30 lakh at 9% for 20 years, prepay 2 lakh after 24 months"`;
            }
            const result = this.calculatePrepaymentSavings(merged.principal, merged.rate, merged.months, prepay, month);
            if (!result) return "❌ Could not compute prepayment plan with those numbers.";
            return `💸 Prepayment Impact\n\n💰 Loan: ${fc(merged.principal)} at ${merged.rate}% for ${merged.months} months\n💵 Prepay: ${fc(prepay)} at month ${month}\n\n⏳ New tenure: ${result.newMonths} months\n🎉 Months saved: ${result.savedMonths}\n💰 Interest saved: ${fc(result.savedInterest)}\n\n💡 Prepay early — interest savings shrink as the loan ages.`;
        }

        // ── TAKE-HOME / CTC ──────────────────────────────────────────────────
        if (I(intents.take_home)) {
            const merged = this.mergeWithContext(this.parseLoanParams(question));
            const ctc = merged.principal;
            if (!ctc) {
                return `💼 Take-Home Salary Estimator\n\nTell me your annual CTC.\n💡 Try: "Take home from 12 lakh CTC" or "In hand from 25 lakh CTC"\n\nRough rule of thumb (varies by company):\n• Up to 5L CTC → ~92% take-home\n• 5–10L CTC → ~85%\n• 10–25L CTC → ~75%\n• 25L+ CTC → ~70%`;
            }
            // Simplified: approximate Basic 50%, HRA 20%, EPF 12% of basic, std deduction 75k, gratuity 4.81% basic
            const basic = ctc * 0.5;
            const hra = ctc * 0.2;
            const special = ctc * 0.3 - basic * 0.0481 - basic * 0.12;
            const epfEmployer = basic * 0.12;
            const grossAnnual = ctc - epfEmployer - basic * 0.0481;
            const taxableIncome = Math.max(0, grossAnnual - 75000);
            // tax (new regime)
            const slabs = [[400000, 0],[800000, 0.05],[1200000, 0.10],[1600000, 0.15],[2000000, 0.20],[2400000, 0.25],[Infinity, 0.30]];
            let tax = 0; let prev = 0;
            for (const [lim, rt] of slabs) { if (taxableIncome <= prev) break; tax += (Math.min(taxableIncome, lim) - prev) * rt; prev = lim; }
            const rebate = taxableIncome <= 1200000 ? tax : 0;
            const totalTax = (Math.max(tax - rebate, 0)) * 1.04;
            const annualTakeHome = grossAnnual - basic * 0.12 - totalTax;
            return `💼 Take-Home Estimate (CTC ${fc(ctc)})\n\n📊 Approx breakup:\n• Basic + DA: ${fc(basic)}\n• HRA: ${fc(hra)}\n• Other allowances: ${fc(Math.max(special, 0))}\n• Employer EPF: -${fc(epfEmployer)}\n• Employee EPF: -${fc(basic * 0.12)}\n• Gratuity (locked): -${fc(basic * 0.0481)}\n\n🧾 Estimated tax (New Regime): ${fc(totalTax)}\n\n💰 Annual in-hand: ${fc(annualTakeHome)}\n📅 Monthly in-hand: ${fc(annualTakeHome / 12)}\n\n⚠️ Approximate only — actual depends on company structure & deductions.`;
        }

        // ── SALARY HIKE ──────────────────────────────────────────────────────
        if (I(intents.salary_hike)) {
            const m = question.match(/(\d+(?:\.\d+)?)\s*%/);
            const hikePct = m ? parseFloat(m[1]) : null;
            if (summary.income > 0 && hikePct) {
                const newIncome = summary.income * (1 + hikePct / 100);
                const extra = newIncome - summary.income;
                const recommendedSavings = extra * 0.7;
                return `🎉 Congrats on the ${hikePct}% hike!\n\n💵 Old monthly: ${fc(summary.income)}\n💵 New monthly: ${fc(newIncome)} (extra ${fc(extra)})\n\n💡 Smart split of the extra:\n• 70% (${fc(recommendedSavings)}) → bump up your SIP / savings\n• 20% (${fc(extra * 0.2)}) → lifestyle reward (you earned it!)\n• 10% (${fc(extra * 0.1)}) → emergency fund top-up\n\nThis way wealth grows faster than lifestyle inflation.`;
            }
            return `🎉 Got a salary hike?\n\n💡 Smart way to use it:\n• Avoid lifestyle inflation — don't upgrade everything\n• Increase your SIP by the same % (step-up SIP)\n• Top up emergency fund first if it's not 6 months yet\n• Pay off any high-interest debt with the surplus\n\nTell me '15% hike' and I'll show your new in-hand split.`;
        }

        // ── RENT VS BUY ──────────────────────────────────────────────────────
        if (I(intents.rent_vs_buy)) {
            return `🏠 Rent vs Buy — quick framework\n\n✅ BUY when:\n• You'll stay 7+ years in the same city\n• EMI ≤ 40% of income, with 20% down payment ready\n• You have job stability + emergency fund\n\n✅ RENT when:\n• You may relocate within 3–5 years\n• Property prices in your city are 30+ × annual rent (overpriced)\n• You can invest the EMI–rent gap in equity SIPs\n\n📊 Rule of thumb (Price-to-Rent ratio):\n• Under 20 → buying is reasonable\n• 20–30 → grey zone\n• Above 30 → renting wins financially\n\n💡 In most metro India, P/R is 30+ — math favours renting + investing the difference.`;
        }

        // ── DEFAULT FALLBACK ─────────────────────────────────────────────────
        // Try a fuzzy/best-match guess as a last resort
        const ranked = this.rankIntent(q);
        if (ranked.name && ranked.score >= 4) {
            // Re-dispatch by mocking the question with the canonical keyword
            return this.generateChatResponse(ranked.name.replace(/_/g, " "), summary);
        }
        const fuzzy = this.fuzzyGuessIntent(q);
        if (fuzzy && fuzzy.name) {
            return `🤖 Did you mean "${fuzzy.kw}"?\n\nIf yes, just type that and I'll answer. Or type "Help" for the full list of topics.`;
        }
        // If the user typed a number with no clear intent, give a smart hint.
        if (amount) {
            return `🤖 I noticed you mentioned ${fc(amount)} but I'm not sure what to do with it.\n\nDid you mean:\n• "Can I afford a ${fc(amount)} phone?"\n• "EMI for ${fc(amount)} at 9% for 5 years"\n• "SIP of ${fc(amount)} at 12% for 10 years"\n• "Debt payoff plan for ${fc(amount)} at 18%"\n\nType "Help" for the full list.`;
        }
        return `🤖 I'm not sure I caught that. A quick snapshot:\n\n💼 Balance: ${fc(summary.remainingBalance)}\n💰 Savings rate: ${fp(summary.savingsRate)}\n\nTry asking:\n• "EMI for 10 lakh at 9% for 5 years"\n• "Can I afford a 50 thousand phone?"\n• "How is my budget?"\n• "Retirement plan" or "Financial freedom"\n• Type "Help" to see all topics!`;
    }

    // ─── CHAT MESSAGE RENDERER ───────────────────────────────────────────────
    addChatMessage(content, role) {
        const now   = new Date();
        const time  = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

        // Save to history
        this.chatHistory.push({ role, content, time });
        this.saveChatHistory();

        // Render to DOM
        this.renderChatMessage({ role, content, time });

        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    renderChatMessage({ role, content, time }) {
        const wrap    = document.createElement("div");
        wrap.className = "message-wrap message-wrap--" + role;

        const bubble  = document.createElement("div");
        bubble.className = "message message--" + role;

        // Preserve newlines as <br> tags
        bubble.innerHTML = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");

        const ts       = document.createElement("span");
        ts.className   = "message-time";
        ts.textContent = time;

        wrap.appendChild(bubble);
        wrap.appendChild(ts);
        this.elements.chatMessages.appendChild(wrap);
    }

    // ─── CHAT HISTORY STORAGE ────────────────────────────────────────────────
    saveChatHistory() {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.chatHistory));
        } catch (_) {}
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE_KEY);
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (_) {
            this.chatHistory = [];
        }

        if (this.chatHistory.length === 0) {
            // Show welcome message (not saved to history)
            const welcome = document.createElement("div");
            welcome.className = "message-wrap message-wrap--bot";
            welcome.innerHTML = `
                <div class="message message--bot">
                    👋 <strong>Hi! I'm your Budget Advisor.</strong><br><br>
                    I can do a lot more than budget tracking now:<br>
                    🏦 EMI &amp; Loan calculator<br>
                    📈 SIP &amp; FD calculator<br>
                    📉 Inflation impact, 💣 Debt payoff plan<br>
                    🌴 Retirement &amp; 🗽 Financial freedom planner<br>
                    🧾 Income tax estimate, 📊 CIBIL tips<br><br>
                    I understand <em>1 lakh, 50 thousand, 2 crore, 9%, 5 years</em> — just type naturally.<br><br>
                    Type <strong>Help</strong> to see all topics, or tap a chip above!
                </div>
                <span class="message-time">Now</span>
            `;
            this.elements.chatMessages.appendChild(welcome);
        } else {
            // Render a "chat restored" divider
            const divider = document.createElement("div");
            divider.className = "chat-divider";
            divider.textContent = "— Previous conversation —";
            this.elements.chatMessages.appendChild(divider);

            this.chatHistory.forEach(msg => this.renderChatMessage(msg));

            const divider2 = document.createElement("div");
            divider2.className = "chat-divider";
            divider2.textContent = "— Today —";
            this.elements.chatMessages.appendChild(divider2);

            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    clearChat() {
        this.chatHistory = [];
        localStorage.removeItem(CHAT_STORAGE_KEY);
        this.elements.chatMessages.innerHTML = "";

        const welcome = document.createElement("div");
        welcome.className = "message-wrap message-wrap--bot";
        welcome.innerHTML = `
            <div class="message message--bot">
                🗑️ Chat cleared! Fresh start.<br><br>
                Ask me anything about your budget. Type <strong>Help</strong> to see all topics!
            </div>
            <span class="message-time">Now</span>
        `;
        this.elements.chatMessages.appendChild(welcome);
        this.showToast("Chat cleared!", "info");
    }

    showToast(message, type = "info") {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = `toast toast--${type} is-visible`;

        window.clearTimeout(this.toastTimeout);
        this.toastTimeout = window.setTimeout(() => {
            toast.className = "toast";
        }, 2400);
    }

    formatCurrency(value) {
        const absoluteValue = Math.abs(value);
        return `${value < 0 ? "-" : ""}Rs ${this.currencyFormatter.format(absoluteValue)}`;
    }

    formatPercent(value) {
        return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
    }

    renderAll() {
        const summary = this.calculateSummary();
        this.renderExpenseList();
        this.renderSummary(summary);
        this.renderAllocation(summary);
        this.renderSuggestions(summary);
        this.renderScore(summary);
        this.renderForecast(summary);
        this.renderChart(summary);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new SmartBudgetApp();
    initHeroStepIndicator();
});

function initHeroStepIndicator() {
    const dots = Array.from(document.querySelectorAll('.step-dot[data-step-target]'));
    const hint = document.getElementById('stepHintText');
    if (!dots.length) return;

    const sections = dots.map(dot => ({
        dot,
        section: document.getElementById(dot.dataset.stepTarget),
        name: dot.dataset.stepName
    })).filter(x => x.section);

    // Click → smooth scroll to section
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const target = document.getElementById(dot.dataset.stepTarget);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    function updateActive() {
        const offset = window.innerHeight * 0.35;
        const scrollY = window.scrollY + offset;
        let activeIdx = 0;
        sections.forEach((entry, idx) => {
            const top = entry.section.getBoundingClientRect().top + window.scrollY;
            if (scrollY >= top) activeIdx = idx;
        });
        sections.forEach((entry, idx) => {
            entry.dot.classList.toggle('active', idx === activeIdx);
            entry.dot.classList.toggle('completed', idx < activeIdx);
        });
        if (hint) {
            const cur = sections[activeIdx];
            const next = sections[activeIdx + 1];
            hint.textContent = next
                ? `On Step ${activeIdx + 1}: ${cur.name} — next is ${next.name} ↓`
                : `On Step ${activeIdx + 1}: ${cur.name} — you've reached the last step ✅`;
        }
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    updateActive();
}
