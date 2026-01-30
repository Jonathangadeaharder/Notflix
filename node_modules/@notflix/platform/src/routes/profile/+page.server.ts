import { db } from '$lib/server/infrastructure/database';
import { user } from '@notflix/database';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { GAME, HTTP_STATUS } from '$lib/constants';

const profileSchema = z.object({
    gameInterval: z.string().refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= GAME.MAX_INTERVAL_MINUTES;
    }, {
        message: "Interval must be between 1 and 60 minutes"
    })
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
            gameInterval: (profile.gameIntervalMinutes || GAME.DEFAULT_INTERVAL_MINUTES).toString()
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
        const gameInterval = data.gameInterval as string;
        
        const result = profileSchema.safeParse(data);

        if (!result.success) {
            return fail(HTTP_STATUS.BAD_REQUEST, { 
                errors: result.error.flatten().fieldErrors,
                data: { gameInterval }
            });
        }

        await db.update(user)
            .set({ gameIntervalMinutes: parseInt(gameInterval, 10) })
            .where(eq(user.id, session.user.id));

        return { success: true, data: result.data };
    }
};