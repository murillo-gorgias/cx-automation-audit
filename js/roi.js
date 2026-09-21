/* The ROI maths, ported from the live Gorgias calculator.
   Pure arithmetic: answers in, numbers out. No DOM, no state.

   Verified against the four QA scenarios in the build spec, section 7. It also
   reproduces the two Shopping Assistant figures the spec quotes by hand —
   $90/yr at the smallest band and $1,162/yr at the second. */

window.CXA = window.CXA || {};

CXA.roi = (function () {

  /* Defaults, unchanged from the live tool. Every visitor gets the same view:
     Helpdesk + AI Agent, Shopping Assistant on, billed annually. */
  var D = {
    agentCostYear:     52000,
    toolingMonth:      600,
    automationRate:    0.45,   // what GORGIAS automates, never what the visitor does today
    productivityLift:  0.25,
    presaleRate:       0.20,
    chatContactRate:   0.015,
    baselineCvr:       0.025,
    shoppingUplift:    0.82,
    attribution:       0.70
  };

  /* Plan by monthly ticket volume. Basic is unreachable from our band values —
     the smallest is 500 tickets — so its price is deliberately absent rather
     than invented. If a future band ever reaches it, this warns instead of
     quietly using a made-up number. */
  var PLANS = [
    { name: 'Basic',      maxTickets: 300,      monthly: null, aiPerInteraction: null },
    { name: 'Pro',        maxTickets: 2000,     monthly: 300,  aiPerInteraction: 0.90 },
    { name: 'Advanced',   maxTickets: 5000,     monthly: 750,  aiPerInteraction: 0.85 },
    { name: 'Enterprise', maxTickets: Infinity, monthly: 1500, aiPerInteraction: 0.75 }
  ];

  function planFor(ticketsPerMonth) {
    for (var i = 0; i < PLANS.length; i++) {
      if (ticketsPerMonth <= PLANS[i].maxTickets) {
        if (PLANS[i].monthly === null) {
          console.warn('[roi] no price for the ' + PLANS[i].name + ' plan; falling back to Pro');
          return PLANS[1];
        }
        return PLANS[i];
      }
    }
    return PLANS[PLANS.length - 1];
  }

  /* answers: { tickets, agents, traffic, aov } — the numbers behind the bands,
     not the labels. */
  function calculate(answers) {
    var tickets = answers.tickets;
    var agents  = answers.agents;
    var traffic = answers.traffic;
    var aov     = answers.aov;

    var plan = planFor(tickets);

    /* What support costs today */
    var labourToday  = agents * D.agentCostYear;
    var toolingToday = D.toolingMonth * 12;
    var costToday    = labourToday + toolingToday;

    /* What it costs on Gorgias. The automation rate takes tickets off the team,
       and the productivity lift makes the rest cheaper to handle. */
    var labourWithGorgias = agents * (1 - D.automationRate) * (1 - D.productivityLift) * D.agentCostYear;
    var planCost          = plan.monthly * 12;
    var automatedPerMonth = tickets * D.automationRate;
    var aiCost            = automatedPerMonth * plan.aiPerInteraction * 12;
    var costWithGorgias   = labourWithGorgias + planCost + aiCost;

    var costSaved   = costToday - costWithGorgias;
    var costSavedPct = costToday > 0 ? costSaved / costToday : 0;

    /* Shopping Assistant revenue. Shopify only — gated by the caller. */
    var chats            = traffic * D.chatContactRate;
    var presaleChats     = chats * D.presaleRate;
    var baselineOrders   = presaleChats * D.baselineCvr;
    var incrementalOrders = baselineOrders * D.shoppingUplift;
    var attributedOrders = incrementalOrders * D.attribution;
    var saRevenue        = attributedOrders * aov * 12;

    /* When attributed orders round below one a month the revenue figure is
       correct and unusable — $90 a year next to $62,270 saved. Drop the line
       and lead with the saving. */
    var showRevenue = Math.round(attributedOrders) >= 1;

    var totalValue = costSaved + (showRevenue ? saRevenue : 0);
    var gorgiasSpend = planCost + aiCost;

    return {
      plan: plan.name,
      planMonthly: plan.monthly,
      aiPerInteraction: plan.aiPerInteraction,
      automatedPerMonth: automatedPerMonth,

      labourToday: labourToday,
      toolingToday: toolingToday,
      costToday: costToday,

      labourWithGorgias: labourWithGorgias,
      planCost: planCost,
      aiCost: aiCost,
      costWithGorgias: costWithGorgias,

      costSaved: costSaved,
      costSavedPct: costSavedPct,

      attributedOrdersPerMonth: attributedOrders,
      saRevenue: saRevenue,
      showRevenue: showRevenue,

      totalValue: totalValue,
      returnMultiple: gorgiasSpend > 0 ? totalValue / gorgiasSpend : 0
    };
  }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function percent(fraction) {
    return Math.round(fraction * 100) + '%';
  }

  return {
    defaults: D,
    plans: PLANS,
    planFor: planFor,
    calculate: calculate,
    money: money,
    percent: percent
  };
})();
