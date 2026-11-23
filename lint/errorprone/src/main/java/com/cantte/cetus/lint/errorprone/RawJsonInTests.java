package com.cantte.cetus.lint.errorprone;

import com.google.errorprone.BugPattern;
import com.google.errorprone.VisitorState;
import com.google.errorprone.bugpatterns.BugChecker;
import com.google.errorprone.matchers.Description;
import com.sun.source.tree.LiteralTree;
import java.util.regex.Pattern;

@BugPattern(
        summary = "Raw JSON in a test: encode and decode typed records or objects instead, so the test follows"
                + " the model when it changes",
        severity = BugPattern.SeverityLevel.ERROR,
        linkType = BugPattern.LinkType.NONE)
public final class RawJsonInTests extends BugChecker implements BugChecker.LiteralTreeMatcher {

    // A one-element array of a number ("[0]") reads as an index, so arrays of numbers need a second element.
    private static final Pattern JSON_START =
            Pattern.compile("^\\s*(\\{\\s*\"|\\[\\s*([{\"\\[]|(true|false|null)\\b|-?\\d[^\\]]*,))");

    @Override
    public Description matchLiteral(LiteralTree tree, VisitorState state) {
        if (tree.getValue() instanceof String value && JSON_START.matcher(value).find()) {
            return describeMatch(tree);
        }
        return Description.NO_MATCH;
    }
}
