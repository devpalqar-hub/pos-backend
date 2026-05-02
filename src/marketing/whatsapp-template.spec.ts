import { describe, expect, test } from '@jest/globals';
import {
    buildWhatsAppTemplateComponents,
    createTemplate,
    extractVariables,
    renderText,
    toPositionalTemplateText,
} from './whatsapp-template';

describe('whatsapp-template utility', () => {
    test('extractVariables finds all placeholders', () => {
        const text = 'Hello {{name}}! Visit {{restaurant}} for {{offer}}.';
        const vars = extractVariables(text).sort();
        expect(vars).toEqual(['name', 'offer', 'restaurant'].sort());
    });

    test('renderText replaces placeholders with values', () => {
        const text = 'Hello {{name}}! A special offer from {{restaurant}}';
        const rendered = renderText(text, { name: 'Sanjay', restaurant: 'Cafe Blue' });
        expect(rendered).toBe('Hello Sanjay! A special offer from Cafe Blue');
    });

    test('createTemplate collects variables from subject and body', () => {
        const tpl = createTemplate('Hello {{name}}', 'Use code {{code}} at {{restaurant}}');
        expect(tpl.variables.sort()).toEqual(['name', 'code', 'restaurant'].sort());
    });

    test('toPositionalTemplateText converts named placeholders to numbered placeholders', () => {
        const result = toPositionalTemplateText('Hello {{name}}! A special offer from {{restaurant}}');

        expect(result.text).toBe('Hello {{1}}! A special offer from {{2}}');
        expect(result.variables).toEqual(['name', 'restaurant']);
    });

    test('buildWhatsAppTemplateComponents adds positional example payloads', () => {
        const components = buildWhatsAppTemplateComponents(
            [{ type: 'BODY', text: 'Hello {{name}}! A special offer from {{restaurant}}' }],
            'positional',
        );

        expect(components[0].text).toBe('Hello {{1}}! A special offer from {{2}}');
        expect(components[0].example.body_text[0]).toEqual(['Pablo', 'Cafe Blue']);
    });

    test('buildWhatsAppTemplateComponents adds named example payloads', () => {
        const components = buildWhatsAppTemplateComponents(
            [{ type: 'BODY', text: 'Hello {{name}}! A special offer from {{restaurant}}' }],
            'named',
        );

        expect(components[0].text).toBe('Hello {{name}}! A special offer from {{restaurant}}');
        expect(components[0].example.body_text_named_params).toEqual([
            { param_name: 'name', example: 'Pablo' },
            { param_name: 'restaurant', example: 'Cafe Blue' },
        ]);
    });
});
