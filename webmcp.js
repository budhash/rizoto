/* Optional WebMCP tools. No network, image bytes, file paths, or downloads. */
(function (root) {
  const objectSchema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
  function validate(input, schema) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide a JSON object of tool arguments.');
    for (const key of Object.keys(input)) if (!Object.hasOwn(schema.properties, key)) throw new Error(`Unknown argument: ${key}.`);
    for (const key of schema.required) if (!Object.hasOwn(input, key)) throw new Error(`Missing argument: ${key}.`);
    if (schema.minProperties && Object.keys(input).length < schema.minProperties) throw new Error('Provide at least one crop adjustment.');
    for (const [key, value] of Object.entries(input)) {
      const rule = schema.properties[key];
      const numeric = rule.type === 'number' || rule.type === 'integer';
      if (typeof value !== (numeric ? 'number' : rule.type) || (numeric && !Number.isFinite(value))) throw new Error(`Invalid ${key}: expected ${rule.type}.`);
      if (rule.enum && !rule.enum.includes(value)) throw new Error(`Invalid ${key}: choose ${rule.enum.join(', ')}.`);
      if ((rule.minimum !== undefined && value < rule.minimum) || (rule.maximum !== undefined && value > rule.maximum)) throw new Error(`${key} is outside the allowed range.`);
      if (rule.type === 'integer' && !Number.isInteger(value)) throw new Error(`${key} must be a whole number.`);
    }
  }
  function createTools(editor) {
    function tool(name, description, schema, action, readOnly = false) {
      return {
        name, description, inputSchema: schema,
        annotations: { readOnlyHint: readOnly, consequentialHint: false, untrustedContentHint: false },
        async execute(input = {}, options = {}) {
          if (options.signal?.aborted) return { ok: false, error: { code: 'cancelled', message: 'Tool execution was cancelled.' } };
          try { validate(input, schema); }
          catch (error) { return { ok: false, error: { code: 'invalid_arguments', message: error.message } }; }
          try { return { ok: true, ...action(input) }; }
          catch (error) { return { ok: false, error: { code: error.code || 'invalid_settings', message: error.message } }; }
        }
      };
    }
    const number = (minimum, maximum, description) => ({ type: 'number', minimum, maximum, description });
    return [
      tool('rizoto_get_state', 'Read the selected image dimensions, current output settings, crop position, and export readiness. Returns metadata only, without image content or filename.', objectSchema({}), () => ({ state: editor.getState() }), true),
      tool('rizoto_set_output', 'Set the output size of the photo the user has already selected. Updates visible controls and preview; enables resampling. Defaults to crop mode and pixels. Resize mode preserves source proportions by default, deriving height from width. Does not export.', objectSchema({
        width: number(0.001, 8192, 'Requested output width in the chosen unit.'),
        height: number(0.001, 8192, 'Requested output height; resize with proportions locked derives this from width.'),
        unit: { type: 'string', enum: ['px', 'in', 'cm', 'mm'] },
        mode: { type: 'string', enum: ['crop', 'resize'] },
        ppi: { ...number(1, 2400, 'Print resolution; defaults to the current value.'), type: 'integer' },
        proportional: { type: 'boolean', description: 'Resize mode only; false allows stretching. Defaults to true.' }
      }, ['width', 'height']), input => ({ state: editor.setOutput(input) })),
      tool('rizoto_set_crop', 'Adjust the selected photo in crop mode. Zoom is 1–4 times the minimum cover scale. Horizontal and vertical position run from 0 (left/top edge) to 1 (right/bottom edge), with 0.5 centered. Updates the visible preview; does not export.', { ...objectSchema({
        zoom: number(1, 4, 'Crop zoom multiplier.'),
        horizontal: number(0, 1, 'Horizontal position within the available crop range.'),
        vertical: number(0, 1, 'Vertical position within the available crop range.')
      }), minProperties: 1 }, input => ({ state: editor.setCrop(input) })),
      tool('rizoto_prepare_export', 'Choose PNG, JPG, or WebP for the current valid preview. Returns readiness and asks the user to review and click Download photo. Does not download or return image bytes.', objectSchema({
        format: { type: 'string', enum: ['png', 'jpg', 'webp'] }
      }, ['format']), input => ({ state: editor.prepareExport(input), nextStep: 'Review the preview, then click Download photo to save it.' }))
    ];
  }
  async function register(document, editor) {
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== 'function') return false;
    const controller = new AbortController();
    try {
      for (const tool of createTools(editor)) await context.registerTool(tool, { signal: controller.signal });
      return true;
    } catch {
      controller.abort();
      return false;
    }
  }
  const api = { createTools, register };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RizotoWebMCP = api;
})(globalThis);
