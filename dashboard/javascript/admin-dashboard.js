function createAdminDashboardLink() {
	var link = '<a class="sidebar__link" href=/dashboard/admin-dashboard.html><img class="sidebar__icon sidebar__icon--active" src="/app-assets/img/dashboard-icons/edit.svg"><p>Admin</p></a>';
	console.log(link);

  var sidebar = document.querySelector(".sidebar__items");
  var div = document.createElement("div");
  div.innerHTML = link;

  sidebar.appendChild(div);

  console.log(sidebar);

}