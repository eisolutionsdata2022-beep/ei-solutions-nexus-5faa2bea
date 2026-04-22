<?php
require_once('../database/header.php');
?>
<!-- Begin Page Content -->
   <div class="container-fluid">
   <?php if($userdata['usertype']="mainadmin" || $userdata['usertype']=="wluser" ) {?>
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">NSDL Settings</h6>
            </div>
            <div class="card-body">


<?php
if(isset($_POST['priceupdate']) 
&& isset($_POST['nsdl_rt']) 
&& isset($_POST['nsdl_ad']) 
&& isset($_POST['nsdl_md']) 
){
   
$nsdl_rt = get_safe($_POST['nsdl_rt']);   
$nsdl_ad = get_safe($_POST['nsdl_ad']);
$nsdl_md = get_safe($_POST['nsdl_md']);

if(($nsdl_rt>=0 && $nsdl_ad>=0 && $nsdl_md>=0)){
$downCommission = $nsdl_ad+$nsdl_md;    
$myCommission = $nsdl_rt-$userdata['nsdl_id_charge']; 
 
$totalCommission = $myCommission - $downCommission;

if($totalCommission>=0){
    
$sql = "UPDATE `settings` SET `nsdl_rt`='".$nsdl_rt."', `nsdl_ad`='".$nsdl_ad."', `nsdl_md`='".$nsdl_md."' WHERE users='".$userdata['id']."' ";
$stmt = $conn->prepare($sql);
if($stmt->execute()){
echo '<div class="alert alert-success" role="alert">
<strong>Commission!</strong> Set Successfully!</div>';
} else {
echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Data Not Insert!</div>';
}  
    
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Commission Set!</div>';      
}
  
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Input Submit!</div>';    
}
 
 
 




    
}
?>

 

        <script src="https://cdn.ckeditor.com/4.11.2/standard/ckeditor.js"></script>			  
			  
               <form class="user mt-2" action="" method="POST">

                <div class="form-group row">
                  <div class="col-sm-3 mb-3 mb-sm-0">
                    <label>Retailer ID Charges <span class="text-danger">(₹<?php echo $userdata['nsdl_id_charge'];?>+)</span></label>  
                    <input type="number" id="rtCharge" name="nsdl_rt" onkeyup="getCommission('<?php echo $userdata['nsdl_id_charge'];?>');" class="form-control" placeholder="Set ID Charges" value="<?php echo $webdata['nsdl_rt'];?>" required>
                  </div>
                  <div class="col-sm-3 mb-3 mb-sm-0">
                    <label>Distributor Commission</label>  
                    <input type="number" id="adCommission" name="nsdl_ad" onkeyup="getCommission('<?php echo $userdata['nsdl_id_charge'];?>');" class="form-control" placeholder="Set Commission" value="<?php echo $webdata['nsdl_ad'];?>" required>
                  </div>
                  <div class="col-sm-3 mb-3 mb-sm-0">
                    <label>Master Distributor Commission</label>  
                    <input type="number" id="mdCommission" name="nsdl_md" onkeyup="getCommission('<?php echo $userdata['nsdl_id_charge'];?>');" class="form-control" placeholder="Set Commission" value="<?php echo $webdata['nsdl_md'];?>" required>
                  </div>
                  <div class="col-sm-3 mb-3 mb-sm-0">
                    <label>My Commission</label>  
                    <input type="number" id="myCommission" class="form-control" placeholder="My Commission" readonly>
                  </div>
				 
                  <div class="col-sm-4 mb-3 mt-4">
                    <input required="required" type="submit" name="priceupdate" class="btn btn-primary btn-block" value="Submit">
                  </div>
				  </div> 
				  
				  
				 </form>
<script>
function getCommission(myCharge){
 let rtCharge = document.getElementById("rtCharge").value;  
 let adCommission = document.getElementById("adCommission").value;  
 let mdCommission = document.getElementById("mdCommission").value;  
 let myCommission = document.getElementById("myCommission").value;
 let dowCommission = parseInt(adCommission) + parseInt(mdCommission);
 let total = parseInt(rtCharge) - parseInt(myCharge);
 let totalCommission = (total - dowCommission);
 document.getElementById("myCommission").value = totalCommission;
}  
getCommission('<?php echo $userdata['nsdl_id_charge'];?>');
</script>			   
            
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