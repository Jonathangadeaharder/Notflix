import { db } from '$lib/server/infrastructure/database';
import { user } from '@notflix/database';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';

const profileSchema = z.object({
    gameInterval: z.string().regex(/^\d+$/).default('10'),
});

const HTTP_STATUS_SEE_OTHER = 303;

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth();
    if (!session) {
        throw redirect(HTTP_STATUS_SEE_OTHER, '/login');
    }

    const [profile] = await db.select()
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

    if (!profile) {
        throw new Error("User profile not found");
    }

    return {
        profile,
        user: session.user,
        session,
        initialData: {
            gameInterval: (profile.gameIntervalMinutes || 10).toString()
        }
    };
};

export const actions: Actions = {
    updateInterval: async ({ request, locals }) => {
        const session = await locals.auth();
        if (!session) {
            throw redirect(HTTP_STATUS_SEE_OTHER, '/login');
        }

        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        
        const result = profileSchema.safeParse(data);

        if (!result.success) {
            return fail(400, { 
                errors: result.error.flatten().fieldErrors,
                data 
            });
        }

        await db.update(user)
            .set({ gameIntervalMinutes: parseInt(result.data.gameInterval, 10) })
            .where(eq(user.id, session.user.id));

        return { success: true, data: result.data };
    }
};
