package com.cantte.cetus.persistence.dian;

import com.cantte.cetus.domain.dian.DianRule;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;

/** The rules the DIAN reported in a document's verdict; see V44. */
@ApplicationScoped
public class DocumentDianRules {

    @Inject
    EntityManager em;

    /** Texts outside the DIAN's rule format are left out; they stay in the document's errors. */
    @Transactional(Transactional.TxType.MANDATORY)
    public void record(UUID documentId, List<String> errors) {
        for (String error : errors) {
            DianRule.parse(error)
                    .ifPresent(rule -> em.createNativeQuery("""
                            INSERT INTO billing.document_dian_rules (document_id, rule, kind, message)
                            VALUES (:document, :rule, :kind, :message)
                            ON CONFLICT DO NOTHING
                            """)
                            .setParameter("document", documentId)
                            .setParameter("rule", rule.code())
                            .setParameter("kind", rule.kind().name())
                            .setParameter("message", rule.message())
                            .executeUpdate());
        }
    }
}
