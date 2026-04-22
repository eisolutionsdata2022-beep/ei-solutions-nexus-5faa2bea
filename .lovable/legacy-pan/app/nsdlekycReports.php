<?php
require_once('head.php');
if($auth==1){
?>

<style>
body{
  background: white!important;    
}

.card{
    background-color: white!important;
} 

.btn-failed{
background-color: red!important;
color:white;
border:0;
}

.btn-pending{
background-color: #ff9800!important;
color:white;
border:0;
}

.btn-success{
background-color: #067eb5!important;
color:white;
border:0;
}
</style>
<!-- Begin Page Content -->

   <div class="container-fluid mt-4">  
   <!-- DataTales Example -->
          <div class="mb-4">
            <div class="p-2">
			<div class='row'>
			<div class='col-md-6'>
			       
<form class="row mb-3" method="post" action="">
	 <div class="col-md-4 mb-2">
		<input type="date" placeholder="From Date" name="fromdate"  value="<?=date("Y-m-d")?>" class="form-control" required/>			 
	</div>
	 <div class="col-md-4 mb-2">
	    <input type="date" placeholder="To Date" name="todate" value="<?=date("Y-m-d")?>" class="form-control" required/>			
	</div>
	 <div class="col-md-4 mb-2">
	    <input type="text" placeholder="Order ID / Ack Number / Etc" name="search_input" class="form-control"/>			
	</div>
	 <div class="col-md-4 mb-2">
	    <input type="submit" name="search" class='btn btn-primary btn-block' value="Search" >			
	</div>
</form>
<?php
$fromdate = date("Y-m-d");
$todate = date("Y-m-d");
if(isset($_POST['search'])){
$fromdate = date("Y-m-d", strtotime($_POST['fromdate'])); 
$todate = date("Y-m-d", strtotime($_POST['todate'])); 	
$search_input = get_safe($_POST['search_input']); 
}

$search_qury = "";
if(!empty($search_input)){
$search_qury = "CONCAT(`order_id`,`ack_no`) LIKE '%$search_input%' AND";     
}


$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury user_id='".$userdata['id']."' AND date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' ORDER BY `id` DESC");
if($userdata['usertype']=='wluser'){ 
$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury web_url='".$_SERVER['SERVER_NAME']."' AND date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' ORDER BY `id` DESC");
}

$stmt->execute();

$sl=1;
while($row=$stmt->fetch()) {

$type = "Electronic PAN"; 
if($row['type']=="P"){
$type = "Physical PAN";    
}

$gender = "Female"; 
if($row['gender']=="M"){
$gender = "Male";    
}
?>
<div class="card shadow mb-3">
<div class="card-body row py-3">
<div class="col-md-12">   
<b class="text-primary"><?=strtoupper($type)?>
<button class="btn btn-<?=strtolower($row['status'])?> btn-sm ml-5" style="float:right;color:white"><?=strtoupper($row['status'])?></button>
<?="<br><small><b>".$row['order_id']."</b><br>".strtoupper($row['date_time'])?></small></b><br>  
<small><b><?=strtoupper(strtoupper($row['name']))?> - <?=strtoupper($row['dob'])?> (<?=strtoupper($gender)?>)</b><br>
<b>Ack No.:</b> <?=strtoupper($row['ack_no'])?> -
<b></b></small>
</div> 
</div>
</div>
<?php
$sl++;
}						
?>	

</div>
</div>
</div>
</div>
</div>				 

<?php
}
require_once('foot.php');
?>