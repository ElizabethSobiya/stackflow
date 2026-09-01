package com.stackflow.inventory.support;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.mockito.Mockito;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * A {@link TransactionTemplate} that simply runs the callback, so services that manage their own
 * transaction boundaries stay unit-testable without a database.
 */
public final class TransactionTemplates {

    private TransactionTemplates() {}

    @SuppressWarnings("unchecked")
    public static TransactionTemplate passthrough() {
        TransactionTemplate template = Mockito.mock(TransactionTemplate.class);
        when(template.execute(any()))
                .thenAnswer(invocation ->
                        ((TransactionCallback<Object>) invocation.getArgument(0)).doInTransaction(null));
        return template;
    }
}
