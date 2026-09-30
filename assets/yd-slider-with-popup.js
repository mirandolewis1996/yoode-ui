document.addEventListener("DOMContentLoaded", function () {
    const ydThumbnails = document.querySelectorAll(".yd-thumbnail");
    const ydModal = document.getElementById("yd-imageModal");
    const ydImageSlider = document.getElementById("yd-imageSlider");
    const ydImages = Array.from(ydThumbnails).map((img) => img.src);
    let ydCurrentIndex = 0;
    
    function ydOpenModal(index) {
        ydCurrentIndex = index;
        ydModal.classList.add("show");
        // Clear existing content to avoid duplication
        ydImageSlider.innerHTML = "";
        
        ydImages.forEach((src, i) => {
            let modalImageContainer = document.createElement("div");
            modalImageContainer.classList.add("yd-modalImageContainer");
            modalImageContainer.style.backgroundImage = `url('${src}')`;
            
            // Add animation classes
            modalImageContainer.classList.add("yd-fade-effect");
            
            // Add navigation buttons inside each image container
            if (i === ydCurrentIndex) {
                let closeButton = document.createElement("span");
                closeButton.classList.add("yd-close");
                closeButton.innerHTML = "&times;";
                closeButton.addEventListener("click", ydCloseModal);
                
                let prevButton = document.createElement("button");
                prevButton.classList.add("yd-prev");
                prevButton.innerHTML = "&#10094;";
                prevButton.addEventListener("click", function(e) {
                    e.stopPropagation(); // Prevent event bubbling
                    ydPrevImage();
                });
                
                let nextButton = document.createElement("button");
                nextButton.classList.add("yd-next");
                nextButton.innerHTML = "&#10095;";
                nextButton.addEventListener("click", function(e) {
                    e.stopPropagation(); // Prevent event bubbling
                    ydNextImage();
                });
                
                // Append buttons only to the currently displayed image
                modalImageContainer.appendChild(closeButton);
                modalImageContainer.appendChild(prevButton);
                modalImageContainer.appendChild(nextButton);
            }
            
            // Append to slider
            ydImageSlider.appendChild(modalImageContainer);
        });
        
        ydUpdateImage();
    }
    
    function ydCloseModal() {
        const currentImage = document.querySelectorAll(".yd-modalImageContainer")[ydCurrentIndex];
        
        // Add exit animation
        currentImage.classList.add("yd-fade-out");
        
        // Wait for animation to complete before hiding modal
        setTimeout(() => {
            ydModal.classList.remove("show");
        }, 300); // Match this with CSS animation duration
    }
    
    function ydUpdateImage() {
        // Hide all images and show only the current one
        const images = document.querySelectorAll(".yd-modalImageContainer");
        
        images.forEach((img, index) => {
            if (index === ydCurrentIndex) {
                img.style.display = "block";
                // Reset animation by removing and re-adding class
                img.classList.remove("yd-fade-effect");
                void img.offsetWidth; // Force reflow to restart animation
                img.classList.add("yd-fade-effect");
            } else {
                img.style.display = "none";
            }
        });
    }
    
    function ydNextImage() {
        // Add exit animation to current image
        const currentImage = document.querySelectorAll(".yd-modalImageContainer")[ydCurrentIndex];
        currentImage.classList.add("yd-slide-left");
        
        setTimeout(() => {
            ydCurrentIndex = (ydCurrentIndex + 1) % ydImages.length;
            ydOpenModal(ydCurrentIndex); // Rebuild modal with new buttons inside the image
        }, 300); // Match with CSS animation duration
    }
    
    function ydPrevImage() {
        // Add exit animation to current image
        const currentImage = document.querySelectorAll(".yd-modalImageContainer")[ydCurrentIndex];
        currentImage.classList.add("yd-slide-right");
        
        setTimeout(() => {
            ydCurrentIndex = (ydCurrentIndex - 1 + ydImages.length) % ydImages.length;
            ydOpenModal(ydCurrentIndex); // Rebuild modal with new buttons inside the image
        }, 300); // Match with CSS animation duration
    }
    
    ydThumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener("click", function () {
            ydOpenModal(index);
        });
    });
    
    document.addEventListener("keydown", function (e) {
        if (!ydModal.classList.contains("show")) return;
        if (e.key === "ArrowRight") ydNextImage();
        if (e.key === "ArrowLeft") ydPrevImage();
        if (e.key === "Escape") ydCloseModal();
    });
});