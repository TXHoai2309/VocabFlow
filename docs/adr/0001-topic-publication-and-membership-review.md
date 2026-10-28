# Topic publication is separate from membership review

The existing runtime topic table mixed canonical taxonomy concepts with inferred
word assignments and lost review status during the Development overlay import.
Following the owner's Q4/Q5 decisions on 2026-10-21, topic nodes and individual
memberships now have independent APPROVED/UNREVIEWED states, unknown data stays
UNREVIEWED, and parent selection includes only published descendants with
reviewed memberships. This intentionally allows a truthful empty topic catalog
until evidence or review exists, rather than promoting inferred assignments
because their topic names look canonical; all enabled words remain available
in the broad vocabulary catalog.
