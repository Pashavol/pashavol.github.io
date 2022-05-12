
new Swiper(".heroSlider", {
    effect: "creative",
    creativeEffect: {
        prev: {
            shadow: true,
            translate: ["-20%", 0, -1],
        },
        next: {
            translate: ["100%", 0, 0],
        },
    },
    pagination: {
        el: ".swiper-pagination",
        type: 'bullets',
        clickable: true,
    },
});

new Swiper(".projectsSlider", {
    spaceBetween: 16,
    slidesPerView: 1.25,
    breakpoints: {
        568: {
            slidesPerView: 1.75,
            spaceBetween: 20,
        },
        768: {
            slidesPerView: 2.5,
            spaceBetween: 20,
        },
        992: {
            slidesPerView: 3,
            spaceBetween: 24,
            draggable: false,
        }
    }
});


// Menu click handler
(function () {
    function closeOffcanvasMenus() {
        document.querySelector('.m-offcanvas-overlay').remove();
        document.body.classList.remove('m-offcanvas-body');
        document.querySelectorAll('.m-offcanvas').forEach((it) => {
            it.classList.remove('m-offcanvas_active');
        });
    }

    function openOffcanvasMenu(id) {
        const overlay = document.createElement('div');
        overlay.classList.add('m-offcanvas-overlay');
        document.body.classList.add('m-offcanvas-body');
        document.body.prepend(overlay);
        document.querySelector(id).classList.add('m-offcanvas_active');
        overlay.addEventListener('click', closeOffcanvasMenus);
    }

    document.querySelectorAll('.m-offcanvas-open').forEach((it) => {
        it.addEventListener('click', function (e) {
            e.preventDefault();
            openOffcanvasMenu(it.dataset.id);
        });
    });

    document.querySelectorAll('.m-offcanvas-close').forEach((it) => {
        it.addEventListener('click', closeOffcanvasMenus);
    })
})();

// Multilevel menu
(function () {
    const multilevelOffcanvas = document.querySelector('.m-offcanvas-multilevel');
    if (multilevelOffcanvas) {
        multilevelOffcanvas.querySelectorAll('.m-offcanvas__subnav')
            .forEach((it) => {
                it.parentElement.classList.add('m-offcanvas__has-subnav');

                const backTrack = document.createElement('li');
                backTrack.innerHTML = `<a class='m-offcanvas__back-track'>${it.previousElementSibling.textContent}</a>`;

                const mainCategory = it.previousElementSibling.cloneNode(true);
                mainCategory.className = '';
                mainCategory.classList.add('m-offcanvas__main-category');
                it.prepend(backTrack);

                const btnCategory = document.createElement('div');
                btnCategory.innerHTML = `
                <div class="m-offcanvas__footer">
            <div class="text-gray-700 fs-16 lh-120 mt-32">
                ул.Красная, 245,  г. Краснодар
            </div>
            <a href="#" class="btn btn-custom btn-black py-0 mt-16">
                Связаться с нами
                <svg class="d-block ico" xmlns="http://www.w3.org/2000/svg">
                    <use xlink:href="assets/icons/ico.svg#ico_arrow_crop"></use>
                </svg>
            </a>
            <div class="row g-24">
                <div class="col-auto">
                    <a href="#">
                        <svg class="d-block ico ico-social text-gray-500" xmlns="http://www.w3.org/2000/svg">
                            <use xlink:href="assets/icons/ico.svg#ico_tg"></use>
                        </svg>
                    </a>
                </div>
                <div class="col-auto">
                    <a href="#">
                        <svg class="d-block ico ico-social text-gray-500" xmlns="http://www.w3.org/2000/svg">
                            <use xlink:href="assets/icons/ico.svg#ico_vk"></use>
                        </svg>
                    </a>
                </div>
            </div>
        </div>`;
                it.appendChild(btnCategory);

                backTrack.addEventListener('click', function () {
                    it.classList.remove('m-offcanvas__subnav_active');
                    const prevList = it.previousElementSibling.closest('.m-offcanvas__list');
                    prevList.classList.remove('overflow-hidden');
                });

                it.previousElementSibling.addEventListener('click', function (e) {
                    e.preventDefault();
                    it.classList.add('m-offcanvas__subnav_active');
                    const prevList = this.closest('.m-offcanvas__list');
                    prevList.classList.add('overflow-hidden');
                    prevList.scrollTop = 0;
                });
            });
    }
})();

window.onscroll = function () {
    let isScrolled = false
    const scrollPoint = window.innerHeight
    const nav = document.getElementById('header')

    function onScroll () {
        if ( window.pageYOffset > scrollPoint && !isScrolled ) {
            nav.classList.add("scroll");
            isScrolled = true
        } else if (window.pageYOffset <= scrollPoint && isScrolled) {
            nav.classList.remove("scroll");
            isScrolled = false
        }
    }

    onScroll()  // Makes sure that the class is attached on the first render
    return onScroll
}();

