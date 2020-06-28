// $(".page-scroll").on("click", function (event) {
//   var tujuan = $(this).attr("href");
//   var elemenTujuan = $(tujuan);

//   console.log($("body").scrollTop());
//   // $("body").animate(
//   //   { scrollTop: elemenTujuan.offset().top - 50 },
//   //   1250,
//   //   "swing"
//   // );
//   event.preventDefault();
// });
$(window).scroll(function () {
  var wScroll = $(this).scrollTop();
  if (wScroll > $(".service").offset().top - 450) {
    $(".service .card").each(function (i) {
      $(".pKiri").addClass("pMuncul");
      $(".pKanan ").addClass("pMuncul");
    });
  }
});

$(window).on("load", function () {
  $(".jumbotron").addClass("pMuncul");
});

$(window).scroll(function () {
  var wScroll = $(this).scrollTop();
  if (wScroll > $(".service").offset().top - 100) {
    $(".service .card").each(function (i) {
      $(".footer").addClass("pMuncul");
    });
  }
});
