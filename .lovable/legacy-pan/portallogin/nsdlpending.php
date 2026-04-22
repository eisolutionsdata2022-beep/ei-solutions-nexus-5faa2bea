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
   <?php if($userdata['usertype']=="mainadmin") {?>
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">NSDL e-KYC PAN Pending History</h6>
            </div>
            <div class="card-body">

            <div class="">
 
<?php
if(isset($_GET['id']) && !empty($_GET['status'])){
$status = get_safe($_GET['status']); 
$id = get_safe($_GET['id']);
 
if($status=="success"){

$sql = $conn->prepare("select * from ekycpancard WHERE id = ?");
$sql->execute([$id]);
$ekycpancardData=$sql->fetch();  

if($ekycpancardData['status']=="Pending"){
$orderId = $ekycpancardData['order_id'];
$sqlu = $conn->prepare("UPDATE ekycpancard SET ack_no='".$ekycpancardData['order_id']."', remark='Manual Success', status='Success' WHERE id='".$ekycpancardData['id']."' ");
if($sqlu->execute()){

$ussql = $conn->prepare("select * from loginusers WHERE id = ?");
$ussql->execute([$ekycpancardData['user_id']]);
$usr_d=$ussql->fetch();


$disql = $conn->prepare("select * from loginusers WHERE username = ?");
$disql->execute([$usr_d['createby']]);
$dis_data=$disql->fetch();

$susql = $conn->prepare("select * from loginusers WHERE username = ?");
$susql->execute([$dis_data['createby']]);
$sup_data=$susql->fetch();

$wlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$wlsql->execute([$sup_data['createby']]);
$wl_data=$wlsql->fetch();

$mwlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$mwlsql->execute([$wl_data['createby']]);
$mwl_data=$mwlsql->fetch();

$cup_type = "p_nsdl";

if($dis_data['id']>0){
$rcom = $usr_d[$cup_type] - $dis_data[$cup_type];	
$tcom = $rcom;
if($tcom>0){
$total_credit = $dis_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$dis_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $dis_data['username']);
$txn->bindParam(":bank", $usr_d['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();
}
}

if($sup_data['id']>0){
$rcom = $dis_data[$cup_type] - $sup_data[$cup_type];	
$tcom = $rcom;
if($tcom>0){
$total_credit = $sup_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$sup_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $sup_data['username']);
$txn->bindParam(":bank", $dis_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}
}

if($wl_data['id']>0){
$rcom = $sup_data[$cup_type] - $wl_data[$cup_type];	
$tcom = $rcom;
if($tcom>0){
$total_credit = $wl_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$wl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $wl_data['username']);
$txn->bindParam(":bank", $sup_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}
}

if($mwl_data['id']>0){
$rcom = $wl_data[$cup_type] - $mwl_data[$cup_type];	
$tcom = $rcom;
if($tcom>0){
$total_credit = $mwl_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$mwl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $mwl_data['username']);
$txn->bindParam(":bank", $wl_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}
}  

echo '<div class="alert alert-success" role="alert">
<strong>Status!</strong> Updated Successfully!</div>'; 
}

}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Data Not Found!</div>';     
}
    
}
 
 
if($status=="failed"){

$sql = $conn->prepare("select * from ekycpancard WHERE id = ?");
$sql->execute([$id]);
$ekycpancardData=$sql->fetch();  

if($ekycpancardData['status']=="Pending"){
$orderId = $ekycpancardData['order_id'];
$amount =  $ekycpancardData['amount'];   
$sqlu = $conn->prepare("UPDATE ekycpancard SET ack_no='".$ekycpancardData['order_id']."', remark='Manual Failed', status='Failed' WHERE id='".$ekycpancardData['id']."' ");
if($sqlu->execute()){
    
$ussql = $conn->prepare("select * from loginusers WHERE id = ?");
$ussql->execute([$ekycpancardData['user_id']]);
$usr_d=$ussql->fetch(); 
 
// Debit
$newBal = $usr_d['balance'] + $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$newBal,$usr_d['id']]);
// Debit

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'NSDLPAN';	
$type = 'credit';
$remark = "NSDL EKYC PAN REFUND: Manual Failed";
$status = 'success';
$reference = $orderId;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $usr_d['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $newBal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
echo '<div class="alert alert-success" role="alert">
<strong>Status!</strong> Updated Successfully!</div>';     
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Server is Down!</div>';     
} 
    
}

}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Data Not Found!</div>';     
}
 
}
 
redirect(500,"nsdlpending");     
}
?>
 
                
<form class="row mb-3 pt-3" method="post" action="">
	 <div class="col-md-4 mb-2">
		<input type="date" placeholder="From Date" name="fromdate"  value="<?=date("Y-m-")."01"?>" class="form-control" required/>			 
	</div>
	 <div class="col-md-4 mb-2">
	    <input type="date" placeholder="To Date" name="todate" value="<?=date("Y-m-d")?>" class="form-control" required/>			
	</div>
	 <div class="col-md-4 mb-2">
	    <input type="text" placeholder="Order ID / Username / Etc" name="search_input" class="form-control"/>			
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
                      <th class='text-primary'>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
<?php
$fromdate = date("Y-m-")."01";
$todate = date("Y-m-d");
if(isset($_POST['search'])){
$fromdate = date("Y-m-d", strtotime($_POST['fromdate'])); 
$todate = date("Y-m-d", strtotime($_POST['todate'])); 	
$search_input = get_safe($_POST['search_input']); 
}

$search_qury = "";
if(!empty($search_input)){
$search_qury = "CONCAT(order_id,username) LIKE '%$search_input%' AND";    
}


//$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury user_id='".$userdata['id']."' AND date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' AND status='Pending' ORDER BY `id` DESC");
if($userdata['usertype']=='mainadmin'){
$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' AND status='Pending' ORDER BY `id` ASC");
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


$success = '<a class="btn btn-round btn-success mb-2" href="?id='.$row['id'].'&status=success" onclick="return confirm(\'Are you sure?\')">Success</a><br>';  
$failed = '<a class="btn btn-round btn-danger mb-2" href="?id='.$row['id'].'&status=failed" onclick="return confirm(\'Are you sure?\')">Failed</a>';  


  echo "<tr>
                      <td style='display:none;'>".$sl."</td>
                      <td class='text-primary'>".$row['order_id']."<br><b>".strtoupper($type)."</b><br>".date("d-M-Y h:i:s A",strtotime($row['date_time']))."</td>
                      <td style='font-size:13px' class='text-primary'>".strtoupper($row['username'])."<br>".strtoupper($row['mobile'])."<br>".strtoupper($row['email'])."</td>
					  <td style='font-size:13px' class='text-primary'>".strtoupper($row['name'])."<br>".strtoupper($row['dob'])."<br>".strtoupper($gender)."</td>
                      <td><b style='font-size:13px' class='text-primary'>Ref ID: ".strtoupper($row['ref_id'])."<br>Ack No.".strtoupper($row['ack_no'])."</b></td>
                      <td class='text-primary'>Old Bal: Rs.".strtoupper($row['old_balance'])."<br>New Bal: Rs.".$row['new_balance']."</td> 
					  <td class='text-primary' style='font-size:13px'>".ucwords($row['remark'])."</td> 
                      <td class='text-primary'><b>".$success.$failed."</td>
                      </tr>";
					

		    
$sl++;}							
?>					
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          </div>
<?php
}else{
?>
<img class="img-fluid" src="../bootstrap/img/cloud.png">
<?php
}
?>	  
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