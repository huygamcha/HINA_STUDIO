---
description: Standardized development process for Tiệm ảnh Hina features and bug fixes.
---
# Tiệm ảnh Hina Development Workflow

Follow these steps for every new task to ensure quality and consistency in Tiệm ảnh Hina.

## Phase 1: Planning (Spec)
1. Use the `spec_template.md` in `.agents/templates/` to define the task.
2. Clearly identify the **Objective** and **Acceptance Criteria**.
3. Identify relevant database models in `prisma/schema.prisma`.

## Phase 2: Implementation (Build)
1. **DB First (if needed)**:
   - Check and update `prisma/schema.prisma`.
   - Run: `npx prisma generate` and `npx prisma db push` (or `migrate`).
2. **Backend Logic**:
   - Create or update Remix loaders/actions in `app/routes/*`.
   - Add business logic services in `app/utils/*.server.ts`.
3. **Aesthetic Frontend**:
   - Use the `frontend-design` skill to ensure a **Premium/Editorial** look.
   - Implement animations and glassmorphism where appropriate.
   - Ensure responsive design throughout.

## Phase 3: Evaluation (Test)
1. **Functional Check**: 
   - Does it meet all **Acceptance Criteria**?
   - Any console errors?
2. **Database Integrity**:
   - Check for Foreign Key constraints (e.g., in seed.ts or create/delete logic).
3. **Visual Review**:
   - Does it look "High-end"?
   - Are micro-animations smooth?

# Summary Check before Merging:
- [ ] No regression bugs in S3/Cloudflare integration.
- [ ] Prisma types updated.
- [ ] UI is responsive and consistent.
- [ ] Mobile navigation works.
