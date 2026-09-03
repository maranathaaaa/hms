/**
 * OpenAPI documentation for the static file surface.
 *
 * Uploaded medical reports are written to the directory in
 * `src/middleware/upload.middleware.ts` and served by `express.static` mounted
 * at `/uploads` in `index.ts`, so there is no route file to document against.
 * This module is comments only; it is read by `swagger-jsdoc` and never
 * imported at runtime.
 */

/**
 * @openapi
 * /uploads/{filename}:
 *   get:
 *     tags: [Uploads]
 *     summary: Download an uploaded report file
 *     description: >
 *       Serves a stored medical report. Filenames are the random UUIDs assigned
 *       at upload time, and the path is what `reportFileUrl` on a medical record
 *       points at — read the record first rather than constructing this URL.
 *
 *
 *       **This route is not authenticated.** The static handler sits outside the
 *       session middleware, so anyone holding the exact filename can fetch the
 *       file; the UUID name is the only thing standing between the file and the
 *       open internet. Treat the URL itself as the secret and do not paste it
 *       anywhere a patient's report should not go.
 *     operationId: downloadUpload
 *     security: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         description: Stored filename, taken from a record's `reportFileUrl`.
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-f-]{36}\.(pdf|png|jpg|jpeg|webp)$'
 *         example: 6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 *     responses:
 *       200:
 *         description: The file, streamed with its original content type.
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: application/pdf
 *           Content-Length:
 *             schema:
 *               type: integer
 *           ETag:
 *             description: Strong validator; pair with `If-None-Match` to get a `304`.
 *             schema:
 *               type: string
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       304:
 *         description: The cached copy is still current.
 *       404:
 *         description: No such file. Note that the static handler answers with the API's JSON 404 body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Cannot GET /uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 */
