<script>
    function toggleMenu() {
        var menu = document.getElementById("menu");
        if (menu.style.left === "0px") {
            menu.style.left = "-250px";
            menu.style.opacity = 0;
        } else {
            menu.style.left = "0px";
            menu.style.opacity = 1;
        }
    }
</script>
