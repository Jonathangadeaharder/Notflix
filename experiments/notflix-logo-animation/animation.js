document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial Setups
    
    // The entire structure drops in from high above
    // GSAP modifies the Y transform relative to X, so we will drop to y: 55 to maintain baseline
    gsap.set("#n-fall-container", { y: -600 });
    
    // The striped clapper stick is hinged open before falling
    gsap.set("#c-stick", { rotation: -35, transformOrigin: "0px 0px" });
    
    // The "otflix" text is safely hidden behind the mask strictly via X coordinate sliding!
    // No opacity fading needed - it acts like a rigid physical block.
    gsap.set("#otflix-group", { x: -400 });

    // 2. Timeline Sequences
    // Using a deliberately slower timeline base (x1.5 / x2) as requested
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Step 1: The completely formed Movie Clapperboard falls vertically
    tl.to("#n-fall-container", {
        y: 55, // perfectly aligns the N boundary line to the text baseline font height!
        duration: 1.0,
        ease: "power2.in"
    })
    
    // Step 2: On contact with the floor, the Clapper Stick slams shut!
    .to("#c-stick", {
        rotation: 0,
        duration: 0.2, // Very fast, sharp snap
        ease: "power4.in"
    }) 
    
    // Step 3: THE SHATTER/MORPH (Executes exactly upon clapper impact "snap")
    // Fade out the chalk text detailing simulating dissolving dust right on shatter
    .to(["#clapper-details", "#hinge-pin"], {
        opacity: 0,
        duration: 0.5
    }, "impact")
    
    // The Right half of the board slides to the right to form the right leg of the 'N'
    .to("#c-right", {
        attr: { x: 90, width: 30, y: 0, height: 140 }, // Shifts right and stretches to top
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    // The Left half of the board shrinks and stretches upwards to form the left leg of the 'N'
    .to("#c-left", {
        attr: { width: 30, y: 0, height: 140 },
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    // The Clapper Stick seamlessly interpolates points to become the diagonal connector of the 'N'
    .to("#c-stick", {
        attr: { points: "0,0 30,0 120,140 90,140" },
        duration: 1.2,
        ease: "elastic.out(1, 0.5)"
    }, "impact")

    // Step 4: The kinetic energy from the shatter kicks the "otflix" text outwards!
    // We purely slide X so it renders rigidly out behind the mask
    .to("#otflix-group", {
        x: 0, 
        duration: 1.5,
        ease: "elastic.out(1, 0.5)"
    }, "impact+=0.15"); // SLIGHT delay right after the morph begins for physical realism
});
