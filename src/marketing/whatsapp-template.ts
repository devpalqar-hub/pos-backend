// Utility for creating and rendering WhatsApp templates with {{variable}} placeholders

export type WhatsAppParameterFormat = 'named' | 'positional';

export type Template = {
    subject: string;
    body: string;
    variables: string[];
};

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function extractVariables(text: string): string[] {
    const vars = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = VAR_REGEX.exec(text)) !== null) {
        vars.add(m[1]);
    }
    return Array.from(vars);
}

export function createTemplate(subject: string, body: string): Template {
    const vars = new Set<string>();
    extractVariables(subject).forEach(v => vars.add(v));
    extractVariables(body).forEach(v => vars.add(v));
    return { subject, body, variables: Array.from(vars) };
}

export function toPositionalTemplateText(text: string): { text: string; variables: string[] } {
    const seen = new Map<string, number>();
    let nextIndex = 1;

    const converted = text.replace(VAR_REGEX, (_, varName) => {
        if (!seen.has(varName)) {
            seen.set(varName, nextIndex++);
        }
        return `{{${seen.get(varName)}}}`;
    });

    return {
        text: converted,
        variables: Array.from(seen.keys()),
    };
}

export function sampleValueForVariable(variableName: string): string {
    const lower = variableName.toLowerCase();

    if (lower.includes('name')) return 'Pablo';
    if (lower.includes('restaurant')) return 'Cafe Blue';
    if (lower.includes('phone') || lower.includes('mobile')) return '+16505551234';
    if (lower.includes('email')) return 'pablo@example.com';
    if (lower.includes('date')) return '2026-04-30';
    if (lower.includes('order')) return '860198-230332';
    if (lower.includes('amount') || lower.includes('price') || lower.includes('total')) return '99.99';
    if (lower.includes('count') || lower.includes('number')) return '2';

    return 'Example';
}

export function buildWhatsAppTemplateComponent(
    component: Record<string, any>,
    parameterFormat: WhatsAppParameterFormat,
): Record<string, any> {
    if (!component || typeof component.text !== 'string') {
        return component;
    }

    const text = String(component.text);
    const variableNames = extractVariables(text);
    if (variableNames.length === 0) {
        return component;
    }

    if (parameterFormat === 'named') {
        const example = component.example ?? {
            body_text_named_params: variableNames.map((varName) => ({
                param_name: varName,
                example: sampleValueForVariable(varName),
            })),
        };

        return {
            ...component,
            text,
            example,
        };
    }

    const positional = toPositionalTemplateText(text);
    const example = component.example ?? {
        body_text: [[...positional.variables.map((varName) => sampleValueForVariable(varName))]],
    };

    return {
        ...component,
        text: positional.text,
        example,
    };
}

export function buildWhatsAppTemplateComponents(
    components: Record<string, any>[],
    parameterFormat: WhatsAppParameterFormat = 'positional',
): Record<string, any>[] {
    return components.map((component) => buildWhatsAppTemplateComponent(component, parameterFormat));
}

export function renderText(templateText: string, values: Record<string, any>): string {
    return templateText.replace(VAR_REGEX, (_, varName) => {
        if (Object.prototype.hasOwnProperty.call(values, varName)) {
            const v = values[varName];
            return v === null || v === undefined ? "" : String(v);
        }
        throw new Error(`Missing template variable: ${varName}`);
    });
}

export function renderTemplate(t: Template, values: Record<string, any>): { subject: string; body: string } {
    // ensure all declared variables exist in values (optional: allow partial)
    for (const v of t.variables) {
        if (!Object.prototype.hasOwnProperty.call(values, v)) {
            throw new Error(`Missing value for template variable: ${v}`);
        }
    }
    return {
        subject: renderText(t.subject, values),
        body: renderText(t.body, values),
    };
}

// Example usage (for reference):
// const tpl = createTemplate("Hello {{name}}! A special offer from {{restaurant}}", "Hi {{name}}, get 20% at {{restaurant}} tomorrow.");
// const result = renderTemplate(tpl, { name: 'Sanjay', restaurant: 'Cafe Blue' });
// result.subject -> "Hello Sanjay! A special offer from Cafe Blue"
