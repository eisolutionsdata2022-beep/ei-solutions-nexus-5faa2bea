<?php
require_once('../database/header.php');
if($userdata['status']=='paywait'){
echo '<script>
window.location = "paywait.php"
</script>
';	
}
?>
<!-- Begin Page Content -->
   <div class="container-fluid">  
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">NSDL e-KYC PAN History</h6>
            </div>
            <div class="card-body">

            <div class="">
                
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
	    <input type="submit" name="search" class='btn btn-primary' value="Search" >			
	</div>
</form>

            <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                  <thead>
                    <tr>
                      <th style='display:none;'>SL No.</th>
                      <th class='text-primary'>ORDER ID</th>
                      <th class='text-primary'>USER DETAILS</th>
                      <th class='text-primary'>APPLICATION</th>
                      <th class='text-primary'>ACK DETAILS</th>
                      <th class='text-primary'>BALANCE</th>
                      <th class='text-primary'>RESPONSE</th>
                      <th class='text-primary'>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
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
$search_qury = "CONCAT(`username`,`order_id`,`ref_id`,`name`,`ack_no`) LIKE '%$search_input%' AND";     
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

$invoice = '';
if($row['status']=='Success'){
$invoice = '<a class="btn btn-round btn-success" href="nsdlekycpan?encrypted_data='.$row['encrypted_data'].'" target="blank">View</a>';  
}

  echo "<tr>
                      <td style='display:none;'>".$sl."</td>
                      <td class='text-primary'>".$row['order_id']."<br><b>".strtoupper($type)."</b><br>".date("d-M-Y h:i:s A",strtotime($row['date_time']))."</td>
                      <td style='font-size:13px' class='text-primary'>".strtoupper($row['username'])."<br>".strtoupper($row['mobile'])."<br>".strtoupper($row['email'])."</td>
					  <td style='font-size:13px' class='text-primary'>".strtoupper($row['name'])."<br>".strtoupper($row['dob'])."<br>".strtoupper($gender)."</td>
                      <td><b style='font-size:13px' class='text-primary'>Ref ID: ".strtoupper($row['ref_id'])."<br>Ack No.".strtoupper($row['ack_no'])."</b></td>
                      <td class='text-primary'>Old Bal: Rs.".strtoupper($row['old_balance'])."<br>New Bal: Rs.".$row['new_balance']."</td> 
					  <td class='text-primary' style='font-size:13px'>".ucwords($row['remark'])."</td> 
                      <td class='text-primary'><b>".strtoupper($row['status'])."</b><br>".$invoice."</td>
                      </tr>";
					

		    
$sl++;}							
?>					
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
	  
        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>
<link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/css/select2.min.css" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/js/select2.min.js"></script>
<script>
$(document).ready(function() {
$('.select2').select2({
    display: 'block',
    width: '100%',
    allowClear: false,
    height: 'calc(1.5em + .75rem + 2px)',
});
});
</script>