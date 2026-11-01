-- The rules the DIAN reported in each verdict, read once from its texts ("Regla: FAK26, Rechazo: …") so the console
-- can rank them with a GROUP BY. The worker writes them with the verdict (ResultRecorder.completed); this loads
-- the verdicts already recorded, with the same format as DianRule.
CREATE TABLE document_dian_rules (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    rule        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('REJECTION', 'NOTIFICATION')),
    message     TEXT NOT NULL,
    PRIMARY KEY (document_id, rule, kind)
);

INSERT INTO document_dian_rules (document_id, rule, kind, message)
SELECT d.id, m[1], CASE WHEN lower(m[2]) = 'rechazo' THEN 'REJECTION' ELSE 'NOTIFICATION' END, btrim(m[3])
FROM documents d
CROSS JOIN LATERAL jsonb_array_elements_text(d.dian_errors) AS e(error)
CROSS JOIN LATERAL regexp_match(btrim(e.error), '^Regla:\s*([^,]*[^,\s])\s*,\s*(Rechazo|Notificaci[oó]n)\s*:\s*(.*)$', 'i') AS m
WHERE d.status IN ('ACCEPTED', 'REJECTED')
ON CONFLICT DO NOTHING;

-- The console's metrics filter an account's documents by environment and issue date.
CREATE INDEX idx_documents_account_environment_issue ON documents(account_id, environment, issue_date);
