function setupInitialPositions() {
    // The entire structure drops in from high above
    gsap.set("#n-fall-container", { y: -600 });

    // The striped clapper stick is hinged open before falling
    gsap.set("#c-stick", { rotation: -35, transformOrigin: "0px 0px" });

    // The "otflix" text is hidden behind the mask via X coordinate sliding
    gsap.set("#otflix-group", { x: -400 });
}

function buildAnimationTimeline() {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Step 1: The clapperboard falls vertically
    tl.to("#n-fall-container", {
        y: 55,
        duration: 1.0,
        ease: "power2.in"
    })

    // Step 2: Clapper stick slams shut on contact
    .to("#c-stick", {
        rotation: 0,
        duration: 0.2,
        ease: "power4.in"
    })

    // Step 3: Shatter/morph — details dissolve, board morphs into the N letterform
    .to(["#clapper-details", "#hinge-pin"], {
        opacity: 0,
        duration: 0.5
    }, "impact")

    .to("#c-right", {
        attr: { x: 90, width: 30, y: 0, height: 140 },
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    .to("#c-left", {
        attr: { width: 30, y: 0, height: 140 },
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    .to("#c-stick", {
        attr: { points: "0,0 30,0 120,140 90,140" },
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    // Step 4: Kinetic energy kicks the "otflix" text outwards from behind the mask
    .to("#otflix-group", {
        x: 0,
        duration: 1.5,
        ease: "elastic.out(1, 0.5)"
    }, "impact+=0.15");

    return tl;
}

document.addEventListener("DOMContentLoaded", () => {
    setupInitialPositions();
    buildAnimationTimeline();
});
