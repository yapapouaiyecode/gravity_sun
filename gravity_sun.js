// gravity_number_pixel.js
// Sandboxels : pixel de gravité réglable avec Ctrl + clic gauche

(function () {
    "use strict";

    // Sert à savoir si CTRL est appuyé
    let ctrlDown = false;

    document.addEventListener("keydown", function (e) {
        if (e.key === "Control") {
            ctrlDown = true;
        }
    });

    document.addEventListener("keyup", function (e) {
        if (e.key === "Control") {
            ctrlDown = false;
        }
    });

    window.addEventListener("blur", function () {
        ctrlDown = false;
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function sign(n) {
        if (n > 0) return 1;
        if (n < 0) return -1;
        return 0;
    }

    function openGravityPopup(pixel) {
        const currentValue = pixel.gravityPower || 30;

        promptInput(
            "Choisis la puissance de gravité.\n\nExemple :\n10 = faible\n30 = normal\n80 = très fort\n-30 = répulsion",
            function (value) {
                let number = parseFloat(value);

                if (isNaN(number)) {
                    logMessage("Nombre invalide.");
                    return;
                }

                number = clamp(number, -200, 200);

                pixel.gravityPower = number;

                if (number > 0) {
                    pixel.color = "#ff9c2a";
                    logMessage("Gravité réglée sur : " + number);
                } else if (number < 0) {
                    pixel.color = "#69dbff";
                    logMessage("Répulsion réglée sur : " + number);
                } else {
                    pixel.color = "#aaaaaa";
                    logMessage("Gravité désactivée.");
                }
            },
            "Réglage gravité",
            String(currentValue)
        );
    }

    function applyGravity(pixel) {
        const power = pixel.gravityPower || 30;

        if (power === 0) return;

        const radius = clamp(Math.abs(power), 1, 200);
        const radiusSq = radius * radius;

        const minX = Math.max(0, pixel.x - radius);
        const maxX = Math.min(width - 1, pixel.x + radius);
        const minY = Math.max(0, pixel.y - radius);
        const maxY = Math.min(height - 1, pixel.y + radius);

        const repulse = power < 0;

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const target = pixelMap[x][y];

                if (!target) continue;
                if (target === pixel) continue;
                if (target.element === "gravity_number_pixel") continue;

                const dx = pixel.x - target.x;
                const dy = pixel.y - target.y;

                const distSq = dx * dx + dy * dy;

                if (distSq < 1 || distSq > radiusSq) continue;

                const dist = Math.sqrt(distSq);

                // Plus c'est proche, plus ça attire fort
                const chance = clamp(1 - dist / radius, 0.02, 1);

                if (Math.random() > chance) continue;

                let moveX = sign(dx);
                let moveY = sign(dy);

                // Si le nombre est négatif, ça repousse
                if (repulse) {
                    moveX *= -1;
                    moveY *= -1;
                }

                const possibleMoves = [];

                if (moveX !== 0 && moveY !== 0) {
                    possibleMoves.push([target.x + moveX, target.y + moveY]);
                }

                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (moveX !== 0) possibleMoves.push([target.x + moveX, target.y]);
                    if (moveY !== 0) possibleMoves.push([target.x, target.y + moveY]);
                } else {
                    if (moveY !== 0) possibleMoves.push([target.x, target.y + moveY]);
                    if (moveX !== 0) possibleMoves.push([target.x + moveX, target.y]);
                }

                for (const move of possibleMoves) {
                    const nx = move[0];
                    const ny = move[1];

                    if (outOfBounds(nx, ny)) continue;

                    if (isEmpty(nx, ny, false)) {
                        tryMove(target, nx, ny, undefined, true);
                        break;
                    }
                }
            }
        }
    }

    elements.gravity_number_pixel = {
        name: "Pixel gravité réglable",
        color: "#ff9c2a",
        behavior: behaviors.WALL,
        category: "special",
        state: "solid",
        density: 999999,
        hardness: 1,
        glow: true,

        properties: {
            gravityPower: 30
        },

        tick: function (pixel) {
            applyGravity(pixel);
        },

        onClicked: function (pixel) {
            if (ctrlDown) {
                openGravityPopup(pixel);
            }
        },

        desc: "Place ce pixel, puis fais Ctrl + clic gauche dessus pour choisir un nombre de gravité. Positif = attire, négatif = repousse."
    };

})();
